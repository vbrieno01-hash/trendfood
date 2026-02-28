import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuItemAddon {
  id: string;
  menu_item_id: string;
  name: string;
  price_cents: number;
  available: boolean;
  sort_order: number;
  created_at: string;
}

export function useMenuItemAddons(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu-item-addons", menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      const { data, error } = await supabase
        .from("menu_item_addons" as any)
        .select("*")
        .eq("menu_item_id", menuItemId)
        .eq("available", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as MenuItemAddon[];
    },
    enabled: !!menuItemId,
  });
}
