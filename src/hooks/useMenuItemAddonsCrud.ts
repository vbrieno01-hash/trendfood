import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MenuItemAddon {
  id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  sort_order: number;
  created_at: string;
}

/** List ALL addons for a menu item (including unavailable — for admin panel) */
export function useAllMenuItemAddons(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu-item-addons-all", menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      const { data, error } = await supabase
        .from("menu_item_addons")
        .select("*")
        .eq("menu_item_id", menuItemId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as MenuItemAddon[];
    },
    enabled: !!menuItemId,
  });
}

export function useAddMenuItemAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { menu_item_id: string; name: string; price_cents: number }) => {
      const { data, error } = await supabase
        .from("menu_item_addons")
        .insert({
          menu_item_id: input.menu_item_id,
          name: input.name,
          price_cents: input.price_cents,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MenuItemAddon;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["menu-item-addons-all", vars.menu_item_id] });
      qc.invalidateQueries({ queryKey: ["menu-item-addons", vars.menu_item_id] });
    },
    onError: () => toast.error("Erro ao adicionar adicional."),
  });
}

export function useUpdateMenuItemAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, menuItemId, ...fields }: { id: string; menuItemId: string; name?: string; price_cents?: number; available?: boolean; sort_order?: number }) => {
      const { error } = await supabase
        .from("menu_item_addons")
        .update(fields)
        .eq("id", id);
      if (error) throw error;
      return menuItemId;
    },
    onSuccess: (menuItemId) => {
      qc.invalidateQueries({ queryKey: ["menu-item-addons-all", menuItemId] });
      qc.invalidateQueries({ queryKey: ["menu-item-addons", menuItemId] });
    },
    onError: () => toast.error("Erro ao atualizar adicional."),
  });
}

export function useDeleteMenuItemAddon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, menuItemId }: { id: string; menuItemId: string }) => {
      const { error } = await supabase
        .from("menu_item_addons")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return menuItemId;
    },
    onSuccess: (menuItemId) => {
      qc.invalidateQueries({ queryKey: ["menu-item-addons-all", menuItemId] });
      qc.invalidateQueries({ queryKey: ["menu-item-addons", menuItemId] });
    },
    onError: () => toast.error("Erro ao remover adicional."),
  });
}
