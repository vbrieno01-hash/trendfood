import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryNeighborhood {
  id: string;
  organization_id: string;
  name: string;
  fee: number;
  active: boolean;
  sort_order: number;
}

export function useDeliveryNeighborhoods(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["delivery_neighborhoods", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("delivery_neighborhoods")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeliveryNeighborhood[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllDeliveryNeighborhoods(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["delivery_neighborhoods_all", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await (supabase as any)
        .from("delivery_neighborhoods")
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeliveryNeighborhood[];
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useNeighborhoodFee(
  neighborhoods: DeliveryNeighborhood[],
  selectedNeighborhood: string,
  subtotal: number,
  freeAbove: number
) {
  if (!selectedNeighborhood) return { fee: 0, freeShipping: false, found: false };
  if (subtotal >= freeAbove) return { fee: 0, freeShipping: true, found: true };
  const match = neighborhoods.find(
    (n) => n.name.toLowerCase() === selectedNeighborhood.toLowerCase()
  );
  if (!match) return { fee: 0, freeShipping: false, found: false };
  return { fee: match.fee, freeShipping: false, found: true };
}

export function useAddNeighborhood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { organization_id: string; name: string; fee: number }) => {
      const { error } = await (supabase as any)
        .from("delivery_neighborhoods")
        .insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods_all"] });
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods"] });
    },
  });
}

export function useUpdateNeighborhood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; fee?: number; active?: boolean; sort_order?: number }) => {
      const { id, ...update } = params;
      const { error } = await (supabase as any)
        .from("delivery_neighborhoods")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods_all"] });
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods"] });
    },
  });
}

export function useDeleteNeighborhood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("delivery_neighborhoods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods_all"] });
      qc.invalidateQueries({ queryKey: ["delivery_neighborhoods"] });
    },
  });
}
