import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// Types (tables not in generated types yet, use manual typing)
export interface Courier {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  plate: string;
  active: boolean;
  created_at: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  organization_id: string;
  courier_id: string | null;
  customer_address: string;
  distance_km: number | null;
  fee: number | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
}

const COURIER_ID_KEY = "trendfood_courier_id";

export function getSavedCourierId(): string | null {
  return localStorage.getItem(COURIER_ID_KEY);
}

export function saveCourierId(id: string) {
  localStorage.setItem(COURIER_ID_KEY, id);
}

export function useMyCourier() {
  const courierId = getSavedCourierId();
  return useQuery({
    queryKey: ["courier", courierId],
    queryFn: async () => {
      if (!courierId) return null;
      const { data, error } = await supabase
        .from("couriers" as any)
        .select("*")
        .eq("id", courierId)
        .single();
      if (error) return null;
      return data as unknown as Courier;
    },
    enabled: !!courierId,
  });
}

export function useRegisterCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; name: string; phone: string; plate: string }) => {
      const { data, error } = await supabase
        .from("couriers" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      const courier = data as unknown as Courier;
      saveCourierId(courier.id);
      return courier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier"] });
    },
  });
}

export function useAvailableDeliveries(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`deliveries-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `organization_id=eq.${organizationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["deliveries", organizationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ["deliveries", organizationId, "pendente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Delivery[];
    },
    enabled: !!organizationId,
  });
}

export function useMyDeliveries(courierId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`my-deliveries-${courierId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `courier_id=eq.${courierId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["deliveries", "mine", courierId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courierId, queryClient]);

  return useQuery({
    queryKey: ["deliveries", "mine", courierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("*")
        .eq("courier_id", courierId!)
        .in("status", ["em_rota"])
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Delivery[];
    },
    enabled: !!courierId,
  });
}

export function useAcceptDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deliveryId, courierId }: { deliveryId: string; courierId: string }) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({ courier_id: courierId, status: "em_rota", accepted_at: new Date().toISOString() } as any)
        .eq("id", deliveryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({ status: "entregue", delivered_at: new Date().toISOString() } as any)
        .eq("id", deliveryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useOrgDeliveries(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-deliveries-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `organization_id=eq.${organizationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["deliveries", organizationId, "all"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ["deliveries", organizationId, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Delivery[];
    },
    enabled: !!organizationId,
  });
}

export function useOrgCouriers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["couriers", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("couriers" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Courier[];
    },
    enabled: !!organizationId,
  });
}
