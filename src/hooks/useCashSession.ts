import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CashSession {
  id: string;
  organization_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  notes: string | null;
  created_at: string;
  opened_by: string | null;
  closed_by: string | null;
  divergence_reason: string | null;
}

export interface CashWithdrawal {
  id: string;
  session_id: string;
  organization_id: string;
  amount: number;
  reason: string | null;
  created_at: string;
  movement_type: "sangria" | "suprimento";
  category: string | null;
}

// Helper to get a typed client for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useActiveCashSession(orgId: string) {
  return useQuery({
    queryKey: ["cash_sessions", "active", orgId],
    queryFn: async () => {
      const { data, error } = await db
        .from("cash_sessions")
        .select("id, organization_id, opened_at, closed_at, opening_balance, closing_balance, notes, created_at, opened_by, closed_by, divergence_reason")
        .eq("organization_id", orgId)
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CashSession | null;
    },
    enabled: !!orgId,
    refetchInterval: 30_000,
  });
}

export function useCashWithdrawals(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["cash_withdrawals", sessionId],
    queryFn: async () => {
      if (!sessionId) return [] as CashWithdrawal[];
      const { data, error } = await db
        .from("cash_withdrawals")
        .select("id, session_id, organization_id, amount, reason, created_at, movement_type, category")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CashWithdrawal[];
    },
    enabled: !!sessionId,
    refetchInterval: 30_000,
  });
}

export function useCashHistory(orgId: string) {
  return useQuery({
    queryKey: ["cash_sessions", "history", orgId],
    queryFn: async () => {
      const { data, error } = await db
        .from("cash_sessions")
        .select("id, organization_id, opened_at, closed_at, opening_balance, closing_balance, notes, created_at, opened_by, closed_by, divergence_reason")
        .eq("organization_id", orgId)
        .not("closed_at", "is", null)
        .order("opened_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as CashSession[];
    },
    enabled: !!orgId,
  });
}

// Histórico de turnos fechados em um período específico (para analytics).
// Limite hard de 200 turnos — suficiente pra 90 dias em qualquer loja realista.
export function useCashHistoryRange(
  orgId: string,
  fromIso: string,
  toIso: string
) {
  return useQuery({
    queryKey: ["cash_sessions", "range", orgId, fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await db
        .from("cash_sessions")
        .select("id, organization_id, opened_at, closed_at, opening_balance, closing_balance, notes, created_at, opened_by, closed_by, divergence_reason")
        .eq("organization_id", orgId)
        .not("closed_at", "is", null)
        .gte("opened_at", fromIso)
        .lte("opened_at", toIso)
        .order("opened_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as CashSession[];
    },
    enabled: !!orgId && !!fromIso && !!toIso,
    staleTime: 60_000,
  });
}

// Resolve nomes dos operadores a partir da tabela profiles (join manual)
export function useOperatorNames(userIds: (string | null | undefined)[]) {
  const clean = Array.from(new Set(userIds.filter((v): v is string => !!v)));
  return useQuery({
    queryKey: ["profiles_names", clean.sort().join(",")],
    queryFn: async () => {
      if (clean.length === 0) return {} as Record<string, string>;
      const { data, error } = await db
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", clean);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { user_id: string; full_name: string | null }[]) {
        map[row.user_id] = row.full_name ?? "";
      }
      return map;
    },
    enabled: clean.length > 0,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useOpenCashSession(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (openingBalance: number) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const { data, error } = await db
        .from("cash_sessions")
        .insert({ organization_id: orgId, opening_balance: openingBalance, opened_by: userId })
        .select()
        .single();
      if (error) throw error;
      return data as CashSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_sessions", "active", orgId] });
      qc.invalidateQueries({ queryKey: ["cash_sessions", "history", orgId] });
    },
  });
}

export function useCloseCashSession(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      closingBalance,
      notes,
      divergenceReason,
    }: {
      sessionId: string;
      closingBalance: number;
      notes?: string;
      divergenceReason?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;
      const { data, error } = await db
        .from("cash_sessions")
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          notes: notes ?? null,
          closed_by: userId,
          divergence_reason: divergenceReason ?? null,
        })
        .eq("id", sessionId)
        .select()
        .single();
      if (error) throw error;
      return data as CashSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_sessions", "active", orgId] });
      qc.invalidateQueries({ queryKey: ["cash_sessions", "history", orgId] });
    },
  });
}

export function useAddWithdrawal(orgId: string, sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      reason,
      movement_type = "sangria",
      category,
    }: {
      amount: number;
      reason?: string;
      movement_type?: "sangria" | "suprimento";
      category?: string;
    }) => {
      const { data, error } = await db
        .from("cash_withdrawals")
        .insert({
          session_id: sessionId,
          organization_id: orgId,
          amount,
          reason: reason ?? null,
          movement_type,
          category: category ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CashWithdrawal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash_withdrawals", sessionId] });
    },
  });
}
