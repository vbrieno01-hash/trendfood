import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Courier {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  plate: string;
  whatsapp?: string;
  pix_key?: string | null;
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
const COURIER_ORG_SLUG_KEY = "trendfood_courier_org_slug";

export function getSavedCourierId(): string | null {
  return localStorage.getItem(COURIER_ID_KEY);
}

export function saveCourierId(id: string) {
  localStorage.setItem(COURIER_ID_KEY, id);
}

export function clearCourierId() {
  localStorage.removeItem(COURIER_ID_KEY);
  localStorage.removeItem(COURIER_ORG_SLUG_KEY);
}

export function getSavedOrgSlug(): string | null {
  return localStorage.getItem(COURIER_ORG_SLUG_KEY);
}

export function saveOrgSlug(slug: string) {
  localStorage.setItem(COURIER_ORG_SLUG_KEY, slug);
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
    mutationFn: async (input: { organization_id: string; name: string; phone: string; plate: string; whatsapp?: string }): Promise<{ courier: Courier; isExisting: boolean }> => {
      // Check if courier already exists for this org + phone
      const { data: existing } = await supabase
        .from("couriers" as any)
        .select("*")
        .eq("organization_id", input.organization_id)
        .eq("phone", input.phone)
        .maybeSingle();

      if (existing) {
        const courier = existing as unknown as Courier;
        saveCourierId(courier.id);
        return { courier, isExisting: true };
      }

      const { data, error } = await supabase
        .from("couriers" as any)
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      const courier = data as unknown as Courier;
      saveCourierId(courier.id);
      return { courier, isExisting: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier"] });
    },
  });
}

export function useAvailableDeliveries(organizationId: string | undefined) {
  const queryClient = useQueryClient();

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
    mutationFn: async ({ deliveryId, courierId, orderId }: { deliveryId: string; courierId: string; orderId: string }) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({ courier_id: courierId, status: "em_rota", accepted_at: new Date().toISOString() } as any)
        .eq("id", deliveryId);
      if (error) throw error;

      const { data: order } = await supabase
        .from("orders")
        .select("notes")
        .eq("id", orderId)
        .single();

      return { notes: order?.notes ?? null };
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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function useLoginCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organization_id: string; phone: string }) => {
      const normalized = normalizePhone(input.phone);
      const { data, error } = await supabase
        .from("couriers" as any)
        .select("*")
        .eq("organization_id", input.organization_id)
        .eq("active", true);
      if (error) throw error;
      const match = (data ?? []).find(
        (c: any) => normalizePhone(c.phone) === normalized
      );
      if (!match) throw new Error("NOT_FOUND");
      const courier = match as unknown as Courier;
      saveCourierId(courier.id);
      return courier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier"] });
    },
  });
}

export function useDeleteCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courierId: string) => {
      const { error } = await supabase
        .from("couriers" as any)
        .update({ active: false } as any)
        .eq("id", courierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
    },
  });
}

// ── New hooks ──

export interface DateRange {
  from: string;
  to: string;
}

export function useOrgDeliveries(organizationId: string | undefined, dateRange?: DateRange) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-deliveries-${organizationId}`)
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
    queryKey: ["deliveries", organizationId, "filtered", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      let query = supabase
        .from("deliveries" as any)
        .select("*")
        .eq("organization_id", organizationId!);

      if (dateRange) {
        query = query.gte("created_at", dateRange.from).lt("created_at", dateRange.to);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Delivery[];
    },
    enabled: !!organizationId,
  });
}

export function useDeleteDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .delete()
        .eq("id", deliveryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useClearDeliveryHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, before }: { orgId: string; before: string }) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .delete()
        .eq("organization_id", orgId)
        .in("status", ["entregue", "cancelada"])
        .lt("created_at", before);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({ status: "cancelada" } as any)
        .eq("id", deliveryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
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

// ── Courier Stats & Payment hooks ──

export interface CourierStats {
  totalDeliveries: number;
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
}

export function useCourierStats(courierId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!courierId) return;
    const channel = supabase
      .channel(`courier-stats-${courierId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `courier_id=eq.${courierId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["courier-stats", courierId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [courierId, queryClient]);

  return useQuery({
    queryKey: ["courier-stats", courierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("fee, courier_paid")
        .eq("courier_id", courierId!)
        .eq("status", "entregue");
      if (error) throw error;
      const rows = (data ?? []) as unknown as { fee: number | null; courier_paid: boolean }[];
      const stats: CourierStats = { totalDeliveries: rows.length, totalEarned: 0, totalPending: 0, totalPaid: 0 };
      for (const r of rows) {
        const fee = r.fee ?? 0;
        stats.totalEarned += fee;
        if (r.courier_paid) {
          stats.totalPaid += fee;
        } else {
          stats.totalPending += fee;
        }
      }
      return stats;
    },
    enabled: !!courierId,
  });
}

export function useOrgDeliveriesUnpaid(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-unpaid-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliveries", filter: `organization_id=eq.${organizationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["deliveries-unpaid", organizationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ["deliveries-unpaid", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries" as any)
        .select("courier_id, fee, courier_paid")
        .eq("organization_id", organizationId!)
        .eq("status", "entregue")
        .eq("courier_paid", false);
      if (error) throw error;
      return (data ?? []) as unknown as { courier_id: string | null; fee: number | null; courier_paid: boolean }[];
    },
    enabled: !!organizationId,
  });
}

export function usePayCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courierId, organizationId }: { courierId: string; organizationId: string }) => {
      const { error } = await supabase
        .from("deliveries" as any)
        .update({ courier_paid: true } as any)
        .eq("courier_id", courierId)
        .eq("organization_id", organizationId)
        .eq("status", "entregue")
        .eq("courier_paid", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries-unpaid"] });
      queryClient.invalidateQueries({ queryKey: ["courier-stats"] });
    },
  });
}

// ── Courier Shift hooks ──

export interface CourierShift {
  id: string;
  courier_id: string;
  organization_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export function useActiveShift(courierId: string | null) {
  return useQuery({
    queryKey: ["courier-shift", courierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_shifts" as any)
        .select("*")
        .eq("courier_id", courierId!)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CourierShift | null;
    },
    enabled: !!courierId,
  });
}

export function useStartShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courierId, organizationId }: { courierId: string; organizationId: string }) => {
      const { data, error } = await supabase
        .from("courier_shifts" as any)
        .insert({ courier_id: courierId, organization_id: organizationId } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CourierShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-shift"] });
      queryClient.invalidateQueries({ queryKey: ["org-active-shifts"] });
    },
  });
}

export function useEndShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from("courier_shifts" as any)
        .update({ ended_at: new Date().toISOString() } as any)
        .eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courier-shift"] });
      queryClient.invalidateQueries({ queryKey: ["org-active-shifts"] });
    },
  });
}

export function useOrgActiveShifts(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-shifts-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courier_shifts", filter: `organization_id=eq.${organizationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["org-active-shifts", organizationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ["org-active-shifts", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courier_shifts" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .is("ended_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as CourierShift[];
    },
    enabled: !!organizationId,
  });
}

export function useOrgShiftHistory(organizationId: string | undefined, dateRange?: DateRange) {
  return useQuery({
    queryKey: ["org-shift-history", organizationId, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      let query = supabase
        .from("courier_shifts" as any)
        .select("*")
        .eq("organization_id", organizationId!);

      if (dateRange) {
        query = query.gte("started_at", dateRange.from).lt("started_at", dateRange.to);
      }

      const { data, error } = await query.order("started_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as CourierShift[];
    },
    enabled: !!organizationId,
  });
}
