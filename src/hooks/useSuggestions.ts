import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Suggestion {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  votes: number;
  status: string;
  created_at: string;
}

export const useSuggestions = (orgId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["suggestions", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("organization_id", orgId)
        .order("votes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Suggestion[];
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`suggestions-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["suggestions", orgId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  return query;
};

export const useAddSuggestion = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { error } = await supabase.from("suggestions").insert({
        organization_id: orgId,
        name,
        description: description || null,
        status: "pending",
        votes: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions", orgId] });
      toast.success("Sugestão enviada com sucesso! 🎉");
    },
    onError: () => toast.error("Erro ao enviar sugestão."),
  });
};

export const useIncrementVote = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await supabase.rpc("increment_vote", { suggestion_id: suggestionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions", orgId] });
    },
    onError: () => toast.error("Erro ao votar."),
  });
};

export const useUpdateSuggestion = (orgId: string, successMessage?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Suggestion> & { id: string }) => {
      const { error } = await supabase
        .from("suggestions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions", orgId] });
      toast.success(successMessage ?? "Sugestão atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar sugestão."),
  });
};

export const useDeleteSuggestion = (orgId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions", orgId] });
      toast.success("Sugestão excluída.");
    },
    onError: () => toast.error("Erro ao excluir sugestão."),
  });
};
