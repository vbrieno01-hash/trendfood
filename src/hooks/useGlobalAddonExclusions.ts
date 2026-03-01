import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlobalAddonExclusion {
  id: string;
  menu_item_id: string;
  global_addon_id: string;
  created_at: string;
}

/** Fetch exclusions for a specific menu item */
export function useGlobalAddonExclusions(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["global-addon-exclusions", menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      const { data, error } = await supabase
        .from("global_addon_exclusions" as any)
        .select("*")
        .eq("menu_item_id", menuItemId);
      if (error) throw error;
      return (data ?? []) as unknown as GlobalAddonExclusion[];
    },
    enabled: !!menuItemId,
  });
}

/** Add an exclusion (hide a global addon from a specific product) */
export function useAddExclusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { menu_item_id: string; global_addon_id: string }) => {
      const { error } = await supabase
        .from("global_addon_exclusions" as any)
        .insert(input);
      if (error) throw error;
      return input.menu_item_id;
    },
    onSuccess: (menuItemId) => {
      qc.invalidateQueries({ queryKey: ["global-addon-exclusions", menuItemId] });
    },
    onError: () => toast.error("Erro ao excluir adicional deste produto."),
  });
}

/** Remove an exclusion (restore a global addon for a specific product) */
export function useRemoveExclusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { menu_item_id: string; global_addon_id: string }) => {
      const { error } = await supabase
        .from("global_addon_exclusions" as any)
        .delete()
        .eq("menu_item_id", input.menu_item_id)
        .eq("global_addon_id", input.global_addon_id);
      if (error) throw error;
      return input.menu_item_id;
    },
    onSuccess: (menuItemId) => {
      qc.invalidateQueries({ queryKey: ["global-addon-exclusions", menuItemId] });
    },
    onError: () => toast.error("Erro ao restaurar adicional."),
  });
}
