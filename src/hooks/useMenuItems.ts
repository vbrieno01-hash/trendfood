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
  { value: "Promoção do dia", emoji: "🔥" },
  { value: "Lanches com 1 hambúrguer e sem batata frita", emoji: "🍔" },
  { value: "Lanches com 2 hambúrgueres e batata frita", emoji: "🍔🍟" },
  { value: "Hambúrgueres triplo", emoji: "🍔" },
  { value: "Gourmets", emoji: "👨‍🍳" },
  { value: "Combos com batata frita", emoji: "🎁🍟" },
  { value: "Combos sem batata frita", emoji: "🎁" },
  { value: "Bebidas", emoji: "🥤" },
  { value: "Porções", emoji: "🍟" },
  { value: "Sobremesas", emoji: "🍰" },
  { value: "Outros", emoji: "🍽️" },
];

const CATEGORY_ORDER = CATEGORIES.map((c) => c.value);

export type SortOrder = "newest" | "oldest";

export function useMenuItems(orgId: string | undefined, sortOrder: SortOrder = "newest") {
  return useQuery({
    queryKey: ["menu_items", orgId, sortOrder],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, organization_id, name, price, description, category, image_url, available, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: sortOrder === "oldest" });
      if (error) throw error;
      return (data as MenuItem[]).sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        const dir = sortOrder === "newest" ? -1 : 1;
        return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
    },
    enabled: !!orgId,
  });
}

export async function uploadMenuImage(orgId: string, itemId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/${itemId}.${ext}`;
  console.log(`[uploadMenuImage] Uploading: path=${path}, size=${file.size}, type=${file.type}`);
  const { error } = await supabase.storage
    .from("menu-images")
    .upload(path, file, { upsert: true });
  if (error) {
    console.error("[uploadMenuImage] Storage upload error:", JSON.stringify(error));
    throw error;
  }
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  const url = data.publicUrl + `?t=${Date.now()}`;
  console.log(`[uploadMenuImage] Success: ${url}`);
  return url;
}

export function useAddMenuItem(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MenuItemInput) => {
      const { data, error } = await supabase
        .from("menu_items")
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description || null,
          price: input.price,
          category: input.category,
          available: input.available,
          image_url: input.image_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from("menu_items")
        .update({
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          category: input.category,
          available: input.available,
          image_url: input.image_url ?? undefined,
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
