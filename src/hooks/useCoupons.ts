import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Coupon {
  id: string;
  organization_id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface CreateCouponPayload {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  max_uses?: number | null;
  expires_at?: string | null;
}

const QK = (orgId: string) => ["coupons", orgId];

export const useCoupons = (orgId: string | undefined) => {
  return useQuery({
    queryKey: QK(orgId!),
    queryFn: async () => {
      if (!orgId) throw new Error("No org");
      const { data, error } = await supabase
        .from("coupons" as never)
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!orgId,
  });
};

export const useCreateCoupon = (orgId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: CreateCouponPayload) => {
      const { error } = await supabase
        .from("coupons" as never)
        .insert({
          organization_id: orgId,
          code: payload.code.toUpperCase().trim(),
          type: payload.type,
          value: payload.value,
          min_order: payload.min_order,
          max_uses: payload.max_uses ?? null,
          expires_at: payload.expires_at ?? null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(orgId) });
      toast({ title: "✅ Cupom criado com sucesso!" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao criar cupom", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateCoupon = (orgId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Coupon> }) => {
      const { error } = await supabase
        .from("coupons" as never)
        .update(updates as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(orgId) });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao atualizar cupom", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteCoupon = (orgId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coupons" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK(orgId) });
      toast({ title: "Cupom removido." });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao remover cupom", description: e.message, variant: "destructive" }),
  });
};

export const validateCoupon = async (
  orgId: string,
  code: string,
  cartTotal: number
): Promise<{ valid: true; coupon: Coupon } | { valid: false; reason: string }> => {
  const { data, error } = await supabase
    .from("coupons" as never)
    .select("*")
    .eq("organization_id", orgId)
    .ilike("code", code.trim())
    .eq("active", true)
    .maybeSingle();

  if (error) return { valid: false, reason: "Erro ao validar cupom." };
  if (!data) return { valid: false, reason: "Cupom não encontrado ou inativo." };

  const coupon = data as Coupon;

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, reason: "Cupom expirado." };
  }
  if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses) {
    return { valid: false, reason: "Limite de usos atingido." };
  }
  if (cartTotal < coupon.min_order) {
    return {
      valid: false,
      reason: `Pedido mínimo de R$ ${coupon.min_order.toFixed(2).replace(".", ",")} para este cupom.`,
    };
  }

  return { valid: true, coupon };
};

export const incrementCouponUses = async (couponId: string) => {
  // Use RPC-style update via raw query
  const { data: current } = await supabase
    .from("coupons" as never)
    .select("uses")
    .eq("id", couponId)
    .single();

  if (!current) return;

  await supabase
    .from("coupons" as never)
    .update({ uses: (current as { uses: number }).uses + 1 } as never)
    .eq("id", couponId);
};
