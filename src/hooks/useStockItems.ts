import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockItem {
  id: string;
  organization_id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  created_at: string;
}

export interface StockItemInput {
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
}

export interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  stock_item_id: string;
  quantity_used: number;
  stock_item?: StockItem;
}

export function useStockItems(orgId: string | undefined) {
  return useQuery({
    queryKey: ["stock_items", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data as StockItem[];
    },
    enabled: !!orgId,
  });
}

export function useAddStockItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: StockItemInput) => {
      const { data, error } = await supabase
        .from("stock_items")
        .insert({
          organization_id: orgId,
          name: input.name,
          unit: input.unit,
          quantity: input.quantity,
          min_quantity: input.min_quantity,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_items", orgId] });
      toast.success("Insumo adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar insumo."),
  });
}

export function useUpdateStockItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<StockItemInput> }) => {
      const { error } = await supabase
        .from("stock_items")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_items", orgId] });
      toast.success("Insumo atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar insumo."),
  });
}

export function useDeleteStockItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_items", orgId] });
      toast.success("Insumo removido!");
    },
    onError: () => toast.error("Erro ao remover insumo."),
  });
}

export function useMenuItemIngredients(menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["menu_item_ingredients", menuItemId],
    queryFn: async () => {
      if (!menuItemId) return [];
      const { data, error } = await supabase
        .from("menu_item_ingredients")
        .select("*, stock_item:stock_items(*)")
        .eq("menu_item_id", menuItemId);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        id: d.id,
        menu_item_id: d.menu_item_id,
        stock_item_id: d.stock_item_id,
        quantity_used: d.quantity_used,
        stock_item: d.stock_item as StockItem,
      })) as MenuItemIngredient[];
    },
    enabled: !!menuItemId,
  });
}

export function useAddMenuItemIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { menu_item_id: string; stock_item_id: string; quantity_used: number }) => {
      const { error } = await supabase
        .from("menu_item_ingredients")
        .insert(input);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["menu_item_ingredients", vars.menu_item_id] });
      toast.success("Ingrediente vinculado!");
    },
    onError: () => toast.error("Erro ao vincular ingrediente."),
  });
}

export function useRemoveMenuItemIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, menuItemId }: { id: string; menuItemId: string }) => {
      const { error } = await supabase.from("menu_item_ingredients").delete().eq("id", id);
      if (error) throw error;
      return menuItemId;
    },
    onSuccess: (menuItemId) => {
      qc.invalidateQueries({ queryKey: ["menu_item_ingredients", menuItemId] });
      toast.success("Ingrediente removido!");
    },
    onError: () => toast.error("Erro ao remover ingrediente."),
  });
}
