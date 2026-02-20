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
  const { data, error } = await (supabase.rpc as Function)("validate_coupon_by_code", {
    _org_id: orgId,
    _code: code.trim(),
    _cart_total: cartTotal,
  });

  if (error) return { valid: false, reason: "Erro ao validar cupom." };

  const result = data as { valid: boolean; reason?: string; coupon?: Coupon };

  if (!result.valid) {
    return { valid: false, reason: result.reason || "Cupom inválido." };
  }

  return { valid: true, coupon: result.coupon as Coupon };
};

export const incrementCouponUses = async (couponId: string) => {
  await (supabase.rpc as Function)("increment_coupon_uses", {
    _coupon_id: couponId,
  });
};
