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
      const { data, error } = await supabase
        .from("loyalty_config")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyConfig | null;
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
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("organization_id", orgId)
        .eq("phone", clean)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyPoints | null;
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
      spendPerPoint,
    }: {
      orgId: string;
      phone: string;
      orderTotal: number;
      spendPerPoint: number;
    }) => {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone.length < 10 || spendPerPoint <= 0) return null;

      const earnedPoints = Math.floor(orderTotal / spendPerPoint);
      if (earnedPoints <= 0) return null;

      // Upsert: create or increment
      const { data: existing } = await supabase
        .from("loyalty_points")
        .select("id, points, total_spent")
        .eq("organization_id", orgId)
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("loyalty_points")
          .update({
            points: existing.points + earnedPoints,
            total_spent: Number(existing.total_spent) + orderTotal,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_points")
          .insert({
            organization_id: orgId,
            phone: cleanPhone,
            points: earnedPoints,
            total_spent: orderTotal,
          });
        if (error) throw error;
      }
      return { earnedPoints };
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

      // Subtract points
      const { data: current } = await supabase
        .from("loyalty_points")
        .select("id, points")
        .eq("organization_id", orgId)
        .eq("phone", cleanPhone)
        .single();

      if (!current || current.points < pointsUsed) throw new Error("Pontos insuficientes");

      const { error: upErr } = await supabase
        .from("loyalty_points")
        .update({ points: current.points - pointsUsed })
        .eq("id", current.id);
      if (upErr) throw upErr;

      // Log redemption
      const { error: insErr } = await supabase
        .from("loyalty_redemptions")
        .insert({
          organization_id: orgId,
          phone: cleanPhone,
          points_used: pointsUsed,
          discount_value: discountValue,
          order_id: orderId ?? null,
        });
      if (insErr) throw insErr;
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
