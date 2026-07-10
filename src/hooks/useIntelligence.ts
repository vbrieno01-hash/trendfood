import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard: só executa queries se o plano permitir. Dupla camada (UI + hook).
 * Todas as agregações rodam no PostgreSQL via RPC — evita `.in()` gigante
 * (URL 414) e trava do navegador em orgs de alto volume.
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
      const { data, error } = await (supabase as any).rpc("intel_profit_analysis", {
        p_org_id: orgId,
        p_days: 30,
      });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        menu_item_id: r.menu_item_id,
        name: r.name ?? "(sem nome)",
        quantity_sold: Number(r.quantity_sold ?? 0),
        revenue: Number(r.revenue ?? 0),
        cost: Number(r.cost ?? 0),
        profit: Number(r.profit ?? 0),
        margin_pct: Number(r.margin_pct ?? 0),
        has_recipe: Boolean(r.has_recipe),
      }));
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
      const { data, error } = await (supabase as any).rpc("intel_orders_heatmap", {
        p_org_id: orgId,
        p_days: 30,
      });
      if (error) throw error;

      const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      let total = 0;
      (data ?? []).forEach((row: any) => {
        const d = Number(row.day_of_week);
        const h = Number(row.hour_of_day);
        const c = Number(row.order_count ?? 0);
        if (d >= 0 && d < 7 && h >= 0 && h < 24) {
          matrix[d][h] = c;
          total += c;
        }
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
      const { data, error } = await (supabase as any).rpc("intel_week_forecast", {
        p_org_id: orgId,
      });
      if (error) throw error;

      // RPC devolve linhas { weeks_ago: 0..4, revenue }
      // weeks_ago 0 = semana atual; 1..4 = anteriores
      const buckets = [0, 0, 0, 0, 0]; // idx 0..3 = anteriores mais antigas → mais recentes; idx 4 = atual
      (data ?? []).forEach((row: any) => {
        const wago = Number(row.weeks_ago);
        const rev = Number(row.revenue ?? 0);
        if (wago === 0) buckets[4] = rev;
        else if (wago >= 1 && wago <= 4) buckets[4 - wago] = rev;
      });

      const currentWeekRevenue = buckets[4];
      const lastWeekRevenue = buckets[3];
      const historicalWeeklyAvg = (buckets[0] + buckets[1] + buckets[2] + buckets[3]) / 4;

      const now = new Date();
      const thisWeekStart = startOfWeek(now);

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
      const { data, error } = await (supabase as any).rpc("intel_smart_alerts", {
        p_org_id: orgId,
      });
      if (error) throw error;

      const alerts: SmartAlert[] = [];
      const recent = Number(data?.recent_revenue ?? 0);
      const prior = Number(data?.prior_revenue ?? 0);
      const delta = Number(data?.revenue_delta_pct ?? 0);

      if (prior > 0 && delta <= -25) {
        alerts.push({
          id: "revenue-drop",
          severity: "red",
          title: `Vendas caíram ${Math.abs(delta).toFixed(0)}% comparado aos 30 dias anteriores`,
          detail: `Últimos 30 dias: R$ ${recent.toFixed(2).replace(".", ",")} · Período anterior: R$ ${prior.toFixed(2).replace(".", ",")}`,
        });
      } else if (prior > 0 && delta >= 20) {
        alerts.push({
          id: "revenue-up",
          severity: "green",
          title: `Parabéns! Vendas subiram ${delta.toFixed(0)}% vs período anterior`,
          detail: `Últimos 30 dias: R$ ${recent.toFixed(2).replace(".", ",")}`,
        });
      }

      const idle: Array<{ id: string; name: string }> = Array.isArray(data?.idle_products) ? data.idle_products : [];
      if (idle.length > 0) {
        alerts.push({
          id: "idle-products",
          severity: "yellow",
          title: `${idle.length} produto(s) sem venda há 15+ dias`,
          detail: idle.map((p) => p.name || "produto").join(", "),
        });
      }

      const missing = Number(data?.loyal_missing_count ?? 0);
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