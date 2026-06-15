import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LoyaltyConfig {
  id: string;
  organization_id: string;
  enabled: boolean;
  spend_per_point: number;
  points_to_redeem: number;
  reward_type: "fixed" | "percent";
  reward_value: number;
}

export interface LoyaltyPoints {
  id: string;
  organization_id: string;
  phone: string;
  points: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyRedemption {
  id: string;
  organization_id: string;
  phone: string;
  points_used: number;
  discount_value: number;
  order_id: string | null;
  created_at: string;
}

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

// ─── Config ────────────────────────────────────────────────────

export const useLoyaltyConfig = (orgId: string | undefined) =>
  useQuery({
    queryKey: ["loyalty_config", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc("get_loyalty_public_config", {
        _org_id: orgId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as LoyaltyConfig | null;
    },
    enabled: !!orgId,
  });

export const useUpsertLoyaltyConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<LoyaltyConfig> & { organization_id: string }) => {
      const { data, error } = await supabase
        .from("loyalty_config")
        .upsert(cfg as any, { onConflict: "organization_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loyalty_config", vars.organization_id] });
    },
  });
};

// ─── Points ────────────────────────────────────────────────────

export const useLoyaltyPoints = (orgId: string | undefined, phone: string | undefined) => {
  const clean = phone ? normalizePhone(phone) : "";
  return useQuery({
    queryKey: ["loyalty_points", orgId, clean],
    queryFn: async () => {
      if (!orgId || clean.length < 10) return null;
      const { data, error } = await supabase.rpc("get_loyalty_points_by_phone", {
        _org_id: orgId,
        _phone: clean,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as LoyaltyPoints | null;
    },
    enabled: !!orgId && clean.length >= 10,
  });
};

export const useLoyaltyPointsList = (orgId: string | undefined) =>
  useQuery({
    queryKey: ["loyalty_points_list", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("organization_id", orgId)
        .order("points", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoyaltyPoints[];
    },
    enabled: !!orgId,
  });

// Accumulate points after order
export const useAccumulateLoyalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orgId,
      phone,
      orderTotal,
      spendPerPoint: _ignored,
    }: {
      orgId: string;
      phone: string;
      orderTotal: number;
      spendPerPoint: number;
    }) => {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone.length < 10) return null;

      const { data, error } = await supabase.rpc("accumulate_loyalty_points", {
        _org_id: orgId,
        _phone: cleanPhone,
        _order_total: orderTotal,
      });
      if (error) throw error;
      return typeof data === "number" && data > 0 ? { earnedPoints: data } : null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty_points"] });
      qc.invalidateQueries({ queryKey: ["loyalty_points_list"] });
    },
  });
};

// Redeem points
export const useRedeemLoyalty = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orgId,
      phone,
      pointsUsed,
      discountValue,
      orderId,
    }: {
      orgId: string;
      phone: string;
      pointsUsed: number;
      discountValue: number;
      orderId?: string;
    }) => {
      const cleanPhone = normalizePhone(phone);
      const { error } = await supabase.rpc("redeem_loyalty_points", {
        _org_id: orgId,
        _phone: cleanPhone,
        _points_used: pointsUsed,
        _discount_value: discountValue,
        _order_id: orderId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty_points"] });
      qc.invalidateQueries({ queryKey: ["loyalty_points_list"] });
      qc.invalidateQueries({ queryKey: ["loyalty_redemptions"] });
    },
  });
};

// ─── Redemptions list (dashboard) ──────────────────────────────

export const useLoyaltyRedemptions = (orgId: string | undefined) =>
  useQuery({
    queryKey: ["loyalty_redemptions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("loyalty_redemptions")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as LoyaltyRedemption[];
    },
    enabled: !!orgId,
  });
