import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PricingItem {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  totalCost: number;
  margin: number | null; // null = sem ficha técnica
  hasIngredients: boolean;
}

export function usePricingData(orgId: string | undefined) {
  return useQuery({
    queryKey: ["pricing_data", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Fetch menu items
      const { data: menuItems, error: e1 } = await supabase
        .from("menu_items")
        .select("id, name, category, price")
        .eq("organization_id", orgId)
        .order("category")
        .order("name");
      if (e1) throw e1;

      // Fetch all ingredients with stock costs
      const { data: ingredients, error: e2 } = await supabase
        .from("menu_item_ingredients")
        .select("menu_item_id, quantity_used, stock_item:stock_items(cost_per_unit)")
        .in("menu_item_id", (menuItems ?? []).map((m) => m.id));
      if (e2) throw e2;

      // Group costs by menu item
      const costMap = new Map<string, number>();
      const hasIngredientsMap = new Map<string, boolean>();
      for (const ing of ingredients ?? []) {
        const cost = (ing.stock_item as any)?.cost_per_unit ?? 0;
        const prev = costMap.get(ing.menu_item_id) ?? 0;
        costMap.set(ing.menu_item_id, prev + ing.quantity_used * cost);
        hasIngredientsMap.set(ing.menu_item_id, true);
      }

      return (menuItems ?? []).map((item): PricingItem => {
        const hasIng = hasIngredientsMap.get(item.id) ?? false;
        const totalCost = costMap.get(item.id) ?? 0;
        const margin = hasIng && item.price > 0
          ? ((item.price - totalCost) / item.price) * 100
          : null;
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          currentPrice: item.price,
          totalCost,
          margin,
          hasIngredients: hasIng,
        };
      });
    },
    enabled: !!orgId,
  });
}

export function useUpdateMenuPrice(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ price })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing_data", orgId] });
      qc.invalidateQueries({ queryKey: ["menuItems", orgId] });
      toast.success("Preço atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar preço."),
  });
}
