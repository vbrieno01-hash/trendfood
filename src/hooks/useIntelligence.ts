import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard: só executa queries se o plano permitir. Dupla camada (UI + hook).
 */
const isAllowed = (enabled: boolean) => enabled === true;

// ----------------------------------------------------------------------
// Bloco 1 — Lucro real por produto (últimos 30 dias)
// ----------------------------------------------------------------------
export interface ProfitRow {
  menu_item_id: string;
  name: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  has_recipe: boolean;
}

export function useProfitAnalysis(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["intel-profit", orgId],
    enabled: !!orgId && isAllowed(enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProfitRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      // 1. Pedidos válidos da loja nos últimos 30 dias
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", since.toISOString());
      if (oErr) throw oErr;
      const orderIds = (orders ?? []).map((o) => o.id);
      if (orderIds.length === 0) return [];

      // 2. Itens desses pedidos
      const { data: items, error: iErr } = await supabase
        .from("order_items")
        .select("menu_item_id, name, price, quantity")
        .in("order_id", orderIds);
      if (iErr) throw iErr;

      // 3. Menu items da loja (nome, preço)
      const { data: menu, error: mErr } = await supabase
        .from("menu_items")
        .select("id, name")
        .eq("organization_id", orgId);
      if (mErr) throw mErr;
      const menuMap = new Map<string, string>();
      (menu ?? []).forEach((m: any) => menuMap.set(m.id, m.name));

      // 4. Ficha técnica: ingredientes por item
      const menuIds = Array.from(new Set((items ?? []).map((it: any) => it.menu_item_id).filter(Boolean)));
      const { data: ingredients, error: gErr } = await supabase
        .from("menu_item_ingredients")
        .select("menu_item_id, quantity_used, stock_item:stock_items(cost_per_unit)")
        .in("menu_item_id", menuIds.length ? menuIds : ["00000000-0000-0000-0000-000000000000"]);
      if (gErr) throw gErr;

      const costByMenuItem = new Map<string, number>();
      (ingredients ?? []).forEach((row: any) => {
        const c = Number(row.stock_item?.cost_per_unit ?? 0) * Number(row.quantity_used ?? 0);
        costByMenuItem.set(row.menu_item_id, (costByMenuItem.get(row.menu_item_id) ?? 0) + c);
      });

      // 5. Agrega por menu_item_id
      const agg = new Map<string, ProfitRow>();
      (items ?? []).forEach((it: any) => {
        if (!it.menu_item_id) return;
        const q = Number(it.quantity ?? 0);
        const p = Number(it.price ?? 0);
        const revenue = q * p;
        const unitCost = costByMenuItem.get(it.menu_item_id) ?? 0;
        const cost = q * unitCost;
        const nameRaw = (it.name ?? "").trim();
        const nameFromMenu = (menuMap.get(it.menu_item_id) ?? "").trim();
        const name = (nameRaw && nameRaw !== ".") ? nameRaw : (nameFromMenu && nameFromMenu !== ".") ? nameFromMenu : "(sem nome)";
        const has_recipe = costByMenuItem.has(it.menu_item_id);
        const prev = agg.get(it.menu_item_id);
        if (prev) {
          prev.quantity_sold += q;
          prev.revenue += revenue;
          prev.cost += cost;
          prev.profit = prev.revenue - prev.cost;
          prev.margin_pct = prev.revenue > 0 ? (prev.profit / prev.revenue) * 100 : 0;
        } else {
          const profit = revenue - cost;
          agg.set(it.menu_item_id, {
            menu_item_id: it.menu_item_id,
            name,
            quantity_sold: q,
            revenue,
            cost,
            profit,
            margin_pct: revenue > 0 ? (profit / revenue) * 100 : 0,
            has_recipe,
          });
        }
      });

      return Array.from(agg.values()).sort((a, b) => b.profit - a.profit);
    },
  });
}

// ----------------------------------------------------------------------
// Bloco 2 — Mapa de calor por hora × dia da semana (últimos 30 dias)
// ----------------------------------------------------------------------
export interface HeatmapData {
  matrix: number[][]; // [dia 0-6][hora 0-23]
  totalOrders: number;
  peak: { day: number; hour: number; count: number } | null;
  worstDay: { day: number; total: number } | null;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function useOrdersHeatmap(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["intel-heatmap", orgId],
    enabled: !!orgId && isAllowed(enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<HeatmapData> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data, error } = await supabase
        .from("orders")
        .select("created_at")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", since.toISOString());
      if (error) throw error;

      const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      let total = 0;
      (data ?? []).forEach((o: any) => {
        // Converte pra horário de Brasília (UTC-3)
        const utc = new Date(o.created_at);
        const brt = new Date(utc.getTime() - 3 * 3600_000);
        const day = brt.getUTCDay();
        const hour = brt.getUTCHours();
        matrix[day][hour] += 1;
        total += 1;
      });

      let peak: HeatmapData["peak"] = null;
      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          if (!peak || matrix[d][h] > peak.count) peak = { day: d, hour: h, count: matrix[d][h] };
        }
      }

      const dailyTotals = matrix.map((row, i) => ({ day: i, total: row.reduce((s, v) => s + v, 0) }));
      const nonZero = dailyTotals.filter((d) => d.total > 0);
      const worstDay = nonZero.length > 0
        ? nonZero.reduce((a, b) => (a.total < b.total ? a : b))
        : null;

      return { matrix, totalOrders: total, peak: peak?.count ? peak : null, worstDay };
    },
  });
}

export const HEATMAP_DAY_NAMES = DAY_NAMES;

// ----------------------------------------------------------------------
// Bloco 3 — Previsão de faturamento da semana
// ----------------------------------------------------------------------
export interface WeekForecast {
  currentWeekRevenue: number;
  daysElapsed: number;
  projectedRevenue: number;
  lastWeekRevenue: number;
  variationPct: number;
  historicalWeeklyAvg: number;
}

function startOfWeek(d: Date) {
  // Domingo como início (0)
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function useWeekForecast(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["intel-forecast", orgId],
    enabled: !!orgId && isAllowed(enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<WeekForecast> => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lookbackStart = new Date(thisWeekStart);
      lookbackStart.setDate(lookbackStart.getDate() - 28); // 4 semanas atrás

      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", lookbackStart.toISOString());
      if (oErr) throw oErr;

      const orderIds = (orders ?? []).map((o: any) => o.id);
      if (orderIds.length === 0) {
        return { currentWeekRevenue: 0, daysElapsed: 1, projectedRevenue: 0, lastWeekRevenue: 0, variationPct: 0, historicalWeeklyAvg: 0 };
      }

      const { data: items, error: iErr } = await supabase
        .from("order_items")
        .select("order_id, price, quantity")
        .in("order_id", orderIds);
      if (iErr) throw iErr;

      const revenueByOrder = new Map<string, number>();
      (items ?? []).forEach((it: any) => {
        revenueByOrder.set(it.order_id, (revenueByOrder.get(it.order_id) ?? 0) + Number(it.price ?? 0) * Number(it.quantity ?? 0));
      });

      const weekBuckets: number[] = [0, 0, 0, 0, 0]; // 4 anteriores + atual
      (orders ?? []).forEach((o: any) => {
        const created = new Date(o.created_at);
        const diffDays = Math.floor((thisWeekStart.getTime() - startOfWeek(created).getTime()) / (86400_000));
        const weeksAgo = Math.floor(diffDays / 7);
        // weeksAgo: 0 = atual, 1 = passada, 2, 3, 4
        const idx = 4 - weeksAgo;
        if (idx >= 0 && idx < 5) {
          weekBuckets[idx] += revenueByOrder.get(o.id) ?? 0;
        }
      });

      const currentWeekRevenue = weekBuckets[4];
      const lastWeekRevenue = weekBuckets[3];
      const historicalWeeklyAvg = (weekBuckets[0] + weekBuckets[1] + weekBuckets[2] + weekBuckets[3]) / 4;

      const msSinceWeekStart = now.getTime() - thisWeekStart.getTime();
      const daysElapsed = Math.max(1, Math.min(7, msSinceWeekStart / 86400_000));
      const dailyRate = currentWeekRevenue / daysElapsed;
      // Projeção: mescla ritmo atual (peso 60%) com média histórica (peso 40%)
      const projectedFromCurrent = dailyRate * 7;
      const projectedRevenue = historicalWeeklyAvg > 0
        ? projectedFromCurrent * 0.6 + historicalWeeklyAvg * 0.4
        : projectedFromCurrent;

      const variationPct = lastWeekRevenue > 0
        ? ((projectedRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : 0;

      return {
        currentWeekRevenue,
        daysElapsed,
        projectedRevenue,
        lastWeekRevenue,
        variationPct,
        historicalWeeklyAvg,
      };
    },
  });
}

// ----------------------------------------------------------------------
// Bloco 4 — Alertas automáticos
// ----------------------------------------------------------------------
export interface SmartAlert {
  id: string;
  severity: "red" | "yellow" | "green";
  title: string;
  detail?: string;
  cta?: { label: string; tab?: string };
}

export function useSmartAlerts(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["intel-alerts", orgId],
    enabled: !!orgId && isAllowed(enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SmartAlert[]> => {
      const alerts: SmartAlert[] = [];
      const now = new Date();

      // 1) Comparação faturamento 30d atuais vs 30d anteriores
      const start60 = new Date(now); start60.setDate(now.getDate() - 60);
      const start30 = new Date(now); start30.setDate(now.getDate() - 30);

      const { data: orders60 } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", start60.toISOString());

      const ids = (orders60 ?? []).map((o: any) => o.id);
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, price, quantity")
          .in("order_id", ids);
        const revByOrder = new Map<string, number>();
        (items ?? []).forEach((it: any) => {
          revByOrder.set(it.order_id, (revByOrder.get(it.order_id) ?? 0) + Number(it.price ?? 0) * Number(it.quantity ?? 0));
        });
        let recent = 0; let prior = 0;
        (orders60 ?? []).forEach((o: any) => {
          const created = new Date(o.created_at);
          const rev = revByOrder.get(o.id) ?? 0;
          if (created >= start30) recent += rev; else prior += rev;
        });

        if (prior > 0) {
          const delta = ((recent - prior) / prior) * 100;
          if (delta <= -25) {
            alerts.push({
              id: "revenue-drop",
              severity: "red",
              title: `Vendas caíram ${Math.abs(delta).toFixed(0)}% comparado aos 30 dias anteriores`,
              detail: `Últimos 30 dias: R$ ${recent.toFixed(2).replace(".", ",")} · Período anterior: R$ ${prior.toFixed(2).replace(".", ",")}`,
            });
          } else if (delta >= 20) {
            alerts.push({
              id: "revenue-up",
              severity: "green",
              title: `Parabéns! Vendas subiram ${delta.toFixed(0)}% vs período anterior`,
              detail: `Últimos 30 dias: R$ ${recent.toFixed(2).replace(".", ",")}`,
            });
          }
        }
      }

      // 2) Produtos parados (últimos 15 dias sem vender, mas venderam nos 30 dias antes disso)
      const start45 = new Date(now); start45.setDate(now.getDate() - 45);
      const start15 = new Date(now); start15.setDate(now.getDate() - 15);

      const { data: orders45 } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", start45.toISOString());
      const ids45 = (orders45 ?? []).map((o: any) => o.id);
      const orderDateMap = new Map<string, Date>();
      (orders45 ?? []).forEach((o: any) => orderDateMap.set(o.id, new Date(o.created_at)));

      if (ids45.length > 0) {
        const { data: items45 } = await supabase
          .from("order_items")
          .select("order_id, menu_item_id, name")
          .in("order_id", ids45);

        const soldOld = new Set<string>();
        const soldRecent = new Set<string>();
        const namesById = new Map<string, string>();
        (items45 ?? []).forEach((it: any) => {
          if (!it.menu_item_id) return;
          const d = orderDateMap.get(it.order_id);
          if (!d) return;
          namesById.set(it.menu_item_id, it.name || "");
          if (d >= start15) soldRecent.add(it.menu_item_id);
          else soldOld.add(it.menu_item_id);
        });

        const idle = Array.from(soldOld).filter((id) => !soldRecent.has(id)).slice(0, 3);
        if (idle.length > 0) {
          const names = idle.map((id) => namesById.get(id) || "produto").join(", ");
          alerts.push({
            id: "idle-products",
            severity: "yellow",
            title: `${idle.length} produto(s) sem venda há 15+ dias`,
            detail: names,
          });
        }
      }

      // 3) Clientes fiéis sumidos (por telefone extraído das notes)
      const start90 = new Date(now); start90.setDate(now.getDate() - 90);
      const { data: allOrders } = await supabase
        .from("orders")
        .select("notes, created_at")
        .eq("organization_id", orgId)
        .neq("status", "cancelled")
        .gte("created_at", start90.toISOString());

      const phoneStats = new Map<string, { count: number; lastAt: Date }>();
      (allOrders ?? []).forEach((o: any) => {
        const notes = o.notes ?? "";
        const match = /TEL:([^|]+)/.exec(notes);
        if (!match) return;
        const phone = match[1].replace(/\D/g, "");
        if (phone.length < 8) return;
        const created = new Date(o.created_at);
        const prev = phoneStats.get(phone);
        if (prev) {
          prev.count += 1;
          if (created > prev.lastAt) prev.lastAt = created;
        } else {
          phoneStats.set(phone, { count: 1, lastAt: created });
        }
      });

      const loyal = Array.from(phoneStats.values()).filter((s) => s.count >= 3);
      const cutoff20 = new Date(now); cutoff20.setDate(now.getDate() - 20);
      const missing = loyal.filter((s) => s.lastAt < cutoff20).length;
      if (missing >= 3) {
        alerts.push({
          id: "loyal-missing",
          severity: "yellow",
          title: `${missing} clientes fiéis sumiram há 20+ dias`,
          detail: "Que tal mandar uma campanha de reativação no WhatsApp?",
          cta: { label: "Criar campanha", tab: "campaigns" },
        });
      }

      return alerts;
    },
  });
}