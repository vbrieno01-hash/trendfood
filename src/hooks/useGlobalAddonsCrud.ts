import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlobalAddon {
  id: string;
  organization_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  sort_order: number;
  created_at: string;
}

/** All global addons for admin panel (including unavailable) */
export function useAllGlobalAddons(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["global-addons-all", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("global_addons" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as GlobalAddon[];
    },
    enabled: !!organizationId,
  });
}

export function useAddGlobalAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; name: string; price_cents: number }) => {
      const { data, error } = await supabase
        .from("global_addons" as any)
        .insert({
          organization_id: input.organization_id,
          name: input.name,
          price_cents: input.price_cents,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GlobalAddon;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["global-addons-all", vars.organization_id] });
      qc.invalidateQueries({ queryKey: ["global-addons", vars.organization_id] });
      toast.success("Adicional fixo criado!");
    },
    onError: () => toast.error("Erro ao criar adicional fixo."),
  });
}

export function useUpdateGlobalAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId, ...fields }: { id: string; organizationId: string; name?: string; price_cents?: number; available?: boolean; sort_order?: number }) => {
      const { error } = await supabase
        .from("global_addons" as any)
        .update(fields)
        .eq("id", id);
      if (error) throw error;
      return organizationId;
    },
    onSuccess: (orgId) => {
      qc.invalidateQueries({ queryKey: ["global-addons-all", orgId] });
      qc.invalidateQueries({ queryKey: ["global-addons", orgId] });
    },
    onError: () => toast.error("Erro ao atualizar adicional fixo."),
  });
}

export function useDeleteGlobalAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from("global_addons" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return organizationId;
    },
    onSuccess: (orgId) => {
      qc.invalidateQueries({ queryKey: ["global-addons-all", orgId] });
      qc.invalidateQueries({ queryKey: ["global-addons", orgId] });
      toast.success("Adicional fixo removido.");
    },
    onError: () => toast.error("Erro ao remover adicional fixo."),
  });
}
