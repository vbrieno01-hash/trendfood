import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MenuItem {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string | null;
  available: boolean;
  imageFile?: File | null;
}

export const CATEGORIES = [
  { value: "Hambúrgueres", emoji: "🍔" },
  { value: "Bebidas", emoji: "🥤" },
  { value: "Porções", emoji: "🍟" },
  { value: "Sobremesas", emoji: "🍰" },
  { value: "Combos", emoji: "🎁" },
  { value: "Outros", emoji: "🍽️" },
];

const CATEGORY_ORDER = CATEGORIES.map((c) => c.value);

export function useMenuItems(orgId: string | undefined) {
  return useQuery({
    queryKey: ["menu_items", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      // Sort by category order, then by name
      return (data as MenuItem[]).sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.name.localeCompare(b.name);
      });
    },
    enabled: !!orgId,
  });
}

async function uploadMenuImage(orgId: string, itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/${itemId}.${ext}`;
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl + `?t=${Date.now()}`;
}

export function useAddMenuItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MenuItemInput) => {
      // First insert to get the ID
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description || null,
          price: input.price,
          category: input.category,
          available: input.available,
          image_url: null,
        })
        .select()
        .single();
      if (error) throw error;

      // Upload image if provided
      let image_url = null;
      if (input.imageFile) {
        image_url = await uploadMenuImage(orgId, data.id, input.imageFile);
        await supabase
          .from("menu_items")
          .update({ image_url })
          .eq("id", data.id);
      }
      return { ...data, image_url };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items", orgId] });
      toast.success("Item adicionado ao cardápio! 🍔");
    },
    onError: () => {
      toast.error("Erro ao adicionar item.");
    },
  });
}

export function useUpdateMenuItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<MenuItemInput>;
    }) => {
      let image_url = input.image_url;

      if (input.imageFile) {
        image_url = await uploadMenuImage(orgId, id, input.imageFile);
      }

      const { error } = await supabase
        .from("menu_items")
        .update({
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          category: input.category,
          available: input.available,
          image_url: image_url ?? undefined,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items", orgId] });
      toast.success("Item atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar item.");
    },
  });
}

export function useDeleteMenuItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, image_url }: { id: string; image_url: string | null }) => {
      // Remove from storage if has image
      if (image_url) {
        const urlPath = image_url.split("/menu-images/")[1]?.split("?")[0];
        if (urlPath) {
          await supabase.storage.from("menu-images").remove([urlPath]);
        }
      }
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu_items", orgId] });
      toast.success("Item removido do cardápio.");
    },
    onError: () => {
      toast.error("Erro ao remover item.");
    },
  });
}
