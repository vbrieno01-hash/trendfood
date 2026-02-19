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
}

export interface CashWithdrawal {
  id: string;
  session_id: string;
  organization_id: string;
  amount: number;
  reason: string | null;
  created_at: string;
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
        .select("*")
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
        .select("*")
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
        .select("*")
        .eq("organization_id", orgId)
        .not("closed_at", "is", null)
        .order("opened_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as CashSession[];
    },
    enabled: !!orgId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useOpenCashSession(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (openingBalance: number) => {
      const { data, error } = await db
        .from("cash_sessions")
        .insert({ organization_id: orgId, opening_balance: openingBalance })
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
    }: {
      sessionId: string;
      closingBalance: number;
      notes?: string;
    }) => {
      const { data, error } = await db
        .from("cash_sessions")
        .update({
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance,
          notes: notes ?? null,
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
    mutationFn: async ({ amount, reason }: { amount: number; reason?: string }) => {
      const { data, error } = await db
        .from("cash_withdrawals")
        .insert({
          session_id: sessionId,
          organization_id: orgId,
          amount,
          reason: reason ?? null,
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
