import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nextPayoutDate } from "./csvUtils";

export type Affiliate = {
  id: string;
  name: string;
  code: string;
  telegram_chat_id: string | null;
  pix_key: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type Tier = {
  id: string;
  plan_key: string;
  cycle: string;
  label: string;
  upfront_pct: number;
  installment_pct: number;
  sort_order: number;
  active: boolean;
};

export type Goal = {
  id: string;
  affiliate_id: string;
  client_org_id: string;
  plan_key: string;
  cycle: string;
  client_amount_cents: number;
  mode: "pending_choice" | "upfront" | "installments_3x";
  status: "awaiting_choice" | "active" | "completed" | "refunded";
  total_commission_cents: number;
  installments_total: number;
  installments_paid: number;
  next_release_at: string | null;
  choice_deadline_at: string;
  client_paid_at: string;
  completed_at: string | null;
  tier_upfront_pct: number;
  tier_installment_pct: number;
};

export type Commission = {
  id: string;
  affiliate_id: string;
  goal_id: string | null;
  organization_id: string;
  amount_paid_cents: number;
  commission_cents: number;
  installment_index: number;
  status: string;
  release_at: string;
  released_at: string | null;
  paid_at: string | null;
  paid_in_batch_id: string | null;
  created_at: string;
};

export type Batch = {
  id: string;
  period_month: string;
  paid_at: string | null;
  status: string;
  total_cents: number;
  affiliate_count: number;
  commission_count: number;
  csv_data: string | null;
  notes: string | null;
  created_at: string;
};

export function useAffiliates() {
  return useQuery({
    queryKey: ["aff", "affiliates"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliates")
        .select("id,name,code,telegram_chat_id,pix_key,phone,active,notes,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Affiliate[];
    },
  });
}

export function useTiers() {
  return useQuery({
    queryKey: ["aff", "tiers"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commission_tiers")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Tier[];
    },
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ["aff", "goals"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_client_goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Goal[];
    },
  });
}

export function useCommissions() {
  return useQuery({
    queryKey: ["aff", "commissions"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("id,affiliate_id,goal_id,organization_id,amount_paid_cents,commission_cents,installment_index,status,release_at,released_at,paid_at,paid_in_batch_id,created_at")
        .order("release_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Commission[];
    },
  });
}

export function useBatches() {
  return useQuery({
    queryKey: ["aff", "batches"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_payout_batches")
        .select("*")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Batch[];
    },
  });
}

export function useOrgsMap(ids: string[]) {
  return useQuery({
    queryKey: ["aff", "orgs", ids.sort().join(",")],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id,name,slug")
        .in("id", ids);
      if (error) throw error;
      const map: Record<string, { name: string; slug: string }> = {};
      (data || []).forEach((o: any) => { map[o.id] = { name: o.name, slug: o.slug }; });
      return map;
    },
  });
}

export function useStoresPerAffiliate() {
  return useQuery({
    queryKey: ["aff", "storesByAff"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, affiliate_id")
        .not("affiliate_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((o: any) => {
        if (o.affiliate_id) counts[o.affiliate_id] = (counts[o.affiliate_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function getNextPayoutCutoff() {
  return nextPayoutDate(new Date());
}