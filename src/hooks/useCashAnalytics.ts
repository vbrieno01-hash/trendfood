import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashHistoryRange, useOperatorNames, type CashSession } from "./useCashSession";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type PaymentBucket = "dinheiro" | "pix" | "cartao" | "outros";

function normalizePaymentMethod(raw: string | null | undefined): PaymentBucket {
  if (!raw) return "outros";
  const v = raw.toString().trim().toLowerCase();
  if (v === "dinheiro" || v === "cash" || v === "money") return "dinheiro";
  if (v === "pix") return "pix";
  if (
    v.includes("card") ||
    v.includes("cartão") ||
    v.includes("cartao") ||
    v.includes("maquin") ||
    v.includes("débito") ||
    v.includes("debito") ||
    v.includes("crédito") ||
    v.includes("credito")
  ) return "cartao";
  return "outros";
}

export interface SessionAnalytics {
  id: string;
  openedAt: string;
  closedAt: string | null;
  operatorId: string | null;
  operatorName: string;
  openingBalance: number;
  closingBalance: number;
  revenue: {
    dinheiro: number;
    pix: number;
    cartao: number;
    outros: number;
    total: number;
  };
  totalSuprimentos: number;
  totalSangrias: number;
  expected: number;
  divergence: number; // closing - expected
  divergenceAbs: number;
}

export interface OperatorRanking {
  operatorId: string;
  operatorName: string;
  sessions: number;
  revenue: number;
  avgDivergence: number;
  avgDivergencePct: number;
  criticalCount: number; // turnos com |divergência| > threshold
}

export interface CashAnalyticsResult {
  isLoading: boolean;
  sessions: SessionAnalytics[];
  totals: {
    revenue: number;
    avgTicket: number;
    divergenceAbs: number;
    divergencePct: number;
    sessionCount: number;
  };
  operatorRanking: OperatorRanking[];
  operatorAlerts: OperatorRanking[]; // com 3+ turnos críticos
}

const DIVERGENCE_THRESHOLD = 5;

export function useCashAnalytics(
  orgId: string,
  fromIso: string,
  toIso: string
): CashAnalyticsResult {
  const { data: sessions = [], isLoading: sessionsLoading } = useCashHistoryRange(
    orgId,
    fromIso,
    toIso
  );

  const sessionIds = sessions.map((s) => s.id);
  const operatorIds = sessions.flatMap((s) => [s.opened_by, s.closed_by]);
  const { data: operatorNames = {} } = useOperatorNames(operatorIds);

  // Carrega TODAS as movimentações dos turnos do período em uma query só.
  const { data: withdrawals = [], isLoading: wdLoading } = useQuery({
    queryKey: ["cash_analytics", "withdrawals", orgId, sessionIds.sort().join(",")],
    queryFn: async () => {
      if (sessionIds.length === 0) return [] as Array<{
        session_id: string;
        movement_type: string;
        amount: number;
      }>;
      const { data, error } = await db
        .from("cash_withdrawals")
        .select("session_id, movement_type, amount")
        .in("session_id", sessionIds);
      if (error) throw error;
      return (data ?? []) as Array<{
        session_id: string;
        movement_type: string;
        amount: number;
      }>;
    },
    enabled: !!orgId && sessionIds.length > 0,
    staleTime: 60_000,
  });

  // Carrega pedidos pagos da janela total [primeira abertura, última fechamento].
  const minOpened = sessions[0]?.opened_at;
  const maxClosed = sessions.reduce<string | null>((acc, s) => {
    if (!s.closed_at) return acc;
    return !acc || s.closed_at > acc ? s.closed_at : acc;
  }, null);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["cash_analytics", "orders", orgId, minOpened ?? "", maxClosed ?? ""],
    queryFn: async () => {
      if (!minOpened || !maxClosed) return [] as Array<{
        created_at: string;
        payment_method: string | null;
        order_items: Array<{ price: number; quantity: number }> | null;
      }>;
      const { data, error } = await db
        .from("orders")
        .select("created_at, payment_method, order_items(price, quantity)")
        .eq("organization_id", orgId)
        .eq("paid", true)
        .gte("created_at", minOpened)
        .lte("created_at", maxClosed);
      if (error) throw error;
      return (data ?? []) as Array<{
        created_at: string;
        payment_method: string | null;
        order_items: Array<{ price: number; quantity: number }> | null;
      }>;
    },
    enabled: !!orgId && !!minOpened && !!maxClosed,
    staleTime: 60_000,
  });

  const isLoading = sessionsLoading || wdLoading || ordersLoading;

  // Agrega tudo por turno
  const perSession: SessionAnalytics[] = sessions.map((s: CashSession) => {
    const wd = withdrawals.filter((w) => w.session_id === s.id);
    const totalSuprimentos = wd
      .filter((w) => w.movement_type === "suprimento")
      .reduce((a, w) => a + Number(w.amount || 0), 0);
    const totalSangrias = wd
      .filter((w) => w.movement_type !== "suprimento")
      .reduce((a, w) => a + Number(w.amount || 0), 0);

    const rev = { dinheiro: 0, pix: 0, cartao: 0, outros: 0 };
    const closedAt = s.closed_at || new Date().toISOString();
    for (const o of orders) {
      if (o.created_at < s.opened_at || o.created_at > closedAt) continue;
      const bucket = normalizePaymentMethod(o.payment_method);
      const total = (o.order_items ?? []).reduce(
        (acc, i) => acc + Number(i.price || 0) * Number(i.quantity || 0),
        0
      );
      rev[bucket] += total;
    }
    const revTotal = rev.dinheiro + rev.pix + rev.cartao + rev.outros;
    const expected =
      s.opening_balance + rev.dinheiro + totalSuprimentos - totalSangrias;
    const closingBalance = s.closing_balance ?? 0;
    const divergence = closingBalance - expected;

    const opId = s.closed_by || s.opened_by;
    return {
      id: s.id,
      openedAt: s.opened_at,
      closedAt: s.closed_at,
      operatorId: opId,
      operatorName: opId ? (operatorNames[opId] || "Operador") : "—",
      openingBalance: s.opening_balance,
      closingBalance,
      revenue: { ...rev, total: revTotal },
      totalSuprimentos,
      totalSangrias,
      expected,
      divergence,
      divergenceAbs: Math.abs(divergence),
    };
  });

  const totalRevenue = perSession.reduce((a, s) => a + s.revenue.total, 0);
  const totalDivergenceAbs = perSession.reduce((a, s) => a + s.divergenceAbs, 0);
  const sessionCount = perSession.length;
  const totals = {
    revenue: totalRevenue,
    avgTicket: sessionCount > 0 ? totalRevenue / sessionCount : 0,
    divergenceAbs: totalDivergenceAbs,
    divergencePct: totalRevenue > 0 ? (totalDivergenceAbs / totalRevenue) * 100 : 0,
    sessionCount,
  };

  // Ranking por operador
  const byOp = new Map<string, SessionAnalytics[]>();
  for (const s of perSession) {
    const key = s.operatorId || "__none__";
    if (!byOp.has(key)) byOp.set(key, []);
    byOp.get(key)!.push(s);
  }
  const operatorRanking: OperatorRanking[] = Array.from(byOp.entries())
    .filter(([k]) => k !== "__none__")
    .map(([opId, list]) => {
      const revenue = list.reduce((a, s) => a + s.revenue.total, 0);
      const totalDiv = list.reduce((a, s) => a + s.divergence, 0);
      const avgDivergence = totalDiv / list.length;
      const avgDivergencePct = revenue > 0 ? (Math.abs(totalDiv) / revenue) * 100 : 0;
      const criticalCount = list.filter((s) => s.divergenceAbs > DIVERGENCE_THRESHOLD).length;
      return {
        operatorId: opId,
        operatorName: list[0]?.operatorName || "Operador",
        sessions: list.length,
        revenue,
        avgDivergence,
        avgDivergencePct,
        criticalCount,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const operatorAlerts = operatorRanking.filter((op) => op.criticalCount >= 3);

  return {
    isLoading,
    sessions: perSession,
    totals,
    operatorRanking,
    operatorAlerts,
  };
}