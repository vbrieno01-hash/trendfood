import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Review {
  id: string;
  organization_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
}

export const useReviews = (orgId?: string) => {
  return useQuery({
    queryKey: ["reviews", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!orgId,
  });
};

export const useReviewByOrder = (orderId?: string) => {
  return useQuery({
    queryKey: ["review", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("order_id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return data as Review | null;
    },
    enabled: !!orderId,
  });
};

export const useSubmitReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (review: {
      organization_id: string;
      order_id?: string;
      rating: number;
      comment?: string;
      customer_name?: string;
    }) => {
      if (review.rating < 1 || review.rating > 5) {
        throw new Error("A nota deve ser entre 1 e 5 estrelas.");
      }
      const payload: Record<string, unknown> = {
        organization_id: review.organization_id,
        rating: review.rating,
      };
      if (review.order_id) payload.order_id = review.order_id;
      if (review.comment) payload.comment = review.comment;
      if (review.customer_name) payload.customer_name = review.customer_name;
      const { data, error } = await supabase
        .from("reviews")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reviews", data.organization_id] });
      if (data.order_id) qc.invalidateQueries({ queryKey: ["review", data.order_id] });
    },
  });
};

export const useDeleteReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
};

export const useReviewStats = (orgId?: string) => {
  const { data: reviews } = useReviews(orgId);
  if (!reviews || reviews.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  const count = reviews.length;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / count;
  const distribution = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { distribution[r.rating - 1]++; });
  return { avg, count, distribution };
};
