import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * For each menu item in the org, calculates the max number of units
 * that can be ordered based on current ingredient stock levels.
 *
 * Items with NO ingredients linked → Infinity (no stock limit).
 * Items with at least one ingredient at zero → 0 (out of stock).
 */
export function useMenuItemStock(orgId: string | undefined) {
  return useQuery({
    queryKey: ["menu_item_stock", orgId],
    queryFn: async () => {
      if (!orgId) return new Map<string, number>();

      // Fetch all ingredients for all menu items of this org,
      // joined with stock_items to get current quantity.
      const { data, error } = await supabase
        .from("menu_item_ingredients")
        .select("menu_item_id, quantity_used, stock_item:stock_items(id, quantity)")
        .in(
          "menu_item_id",
          // sub-select: all menu_item ids for this org
          (await supabase.from("menu_items").select("id").eq("organization_id", orgId)).data?.map(
            (m) => m.id
          ) ?? []
        );

      if (error) throw error;

      // Group by menu_item_id → compute min(floor(stock.quantity / quantity_used))
      const map = new Map<string, number>();

      for (const row of data ?? []) {
        const menuId = row.menu_item_id;
        const stock = row.stock_item as unknown as { id: string; quantity: number } | null;
        if (!stock) continue;

        const canMake =
          row.quantity_used > 0
            ? Math.floor(stock.quantity / row.quantity_used)
            : Infinity;

        const current = map.get(menuId);
        if (current === undefined) {
          map.set(menuId, canMake);
        } else {
          map.set(menuId, Math.min(current, canMake));
        }
      }

      return map;
    },
    enabled: !!orgId,
    refetchInterval: 30_000, // refresh every 30s to stay updated
  });
}
