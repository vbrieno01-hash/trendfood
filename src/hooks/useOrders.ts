import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  quantity: number;
  customer_name?: string | null;
}

export interface Order {
  id: string;
  organization_id: string;
  table_number: number;
  status: "pending" | "preparing" | "ready" | "delivered";
  notes: string | null;
  created_at: string;
  paid: boolean;
  payment_method?: string | null;
  order_items?: OrderItem[];
}

export interface TableRow {
  id: string;
  organization_id: string;
  number: number;
  label: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Tables (Mesas)
// ──────────────────────────────────────────────────────────────────────────────

export const useTables = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ["tables", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("organization_id", organizationId)
        .order("number", { ascending: true });
      if (error) throw error;
      return data as TableRow[];
    },
    enabled: !!organizationId,
  });
};

export const useAddTable = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ number, label }: { number: number; label?: string }) => {
      const { error } = await supabase.from("tables").insert({
        organization_id: organizationId,
        number,
        label: label || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", organizationId] });
      toast({ title: "Mesa criada!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteTable = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tables").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tables", organizationId] });
      toast({ title: "Mesa removida." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Orders (Pedidos)
// ──────────────────────────────────────────────────────────────────────────────

export const useOrders = (
  organizationId: string | undefined,
  statuses: Order["status"][]
) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["orders", organizationId, statuses],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("organization_id", organizationId)
        .in("status", statuses)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organizationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-${organizationId}-${statuses.join("-")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", organizationId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", organizationId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [organizationId, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  return query;
};

export const usePlaceOrder = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      organizationId,
      tableNumber,
      notes,
      items,
      initialStatus,
      paymentMethod,
      paid,
    }: {
      organizationId: string;
      tableNumber: number;
      notes: string;
      items: { menu_item_id: string; name: string; price: number; quantity: number; customer_name?: string }[];
      initialStatus?: string;
      paymentMethod?: string;
      paid?: boolean;
    }) => {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          organization_id: organizationId,
          table_number: tableNumber,
          notes: notes || null,
          status: initialStatus || "pending",
          ...(paymentMethod ? { payment_method: paymentMethod } : {}),
          ...(paid !== undefined ? { paid } : {}),
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        customer_name: i.customer_name || null,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      return order;
    },
    onError: (e: Error) => toast({ title: "Erro ao enviar pedido", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateOrderStatus = (organizationId: string, statuses: Order["status"][]) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order["status"] }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Delivered but unpaid orders (Aguardando Pagamento)
// ──────────────────────────────────────────────────────────────────────────────

export const useDeliveredUnpaidOrders = (organizationId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["orders-unpaid", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("organization_id", organizationId)
        .eq("status", "delivered")
        .eq("paid", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-unpaid-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        () => { qc.invalidateQueries({ queryKey: ["orders-unpaid", organizationId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, qc]); // eslint-disable-line react-hooks/exhaustive-deps

  return query;
};

export const useMarkAsPaid = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ paid: true } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-unpaid", organizationId] });
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
      toast({ title: "✅ Pagamento confirmado!" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// All delivered orders (for HomeTab chart)
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Awaiting PIX payment orders (mode manual)
// ──────────────────────────────────────────────────────────────────────────────

export const useAwaitingPaymentOrders = (organizationId: string | undefined) => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["orders-awaiting-payment", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("organization_id", organizationId)
        .eq("status", "awaiting_payment")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-awaiting-payment-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        () => { qc.invalidateQueries({ queryKey: ["orders-awaiting-payment", organizationId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, qc]);

  return query;
};

export const useConfirmPixPayment = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").update({ status: "pending" } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-awaiting-payment", organizationId] });
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
      toast({ title: "✅ Pagamento PIX confirmado! Pedido enviado para a cozinha." });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

export const useDeliveredOrders = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: ["orders-delivered", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("organization_id", organizationId)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organizationId,
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Order History (delivered orders with period filter, for HistoryTab & BestSellers)
// ──────────────────────────────────────────────────────────────────────────────

type HistoryPeriod = "today" | "7d" | "30d" | "all";

const getPeriodStart = (period: HistoryPeriod): string | null => {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }
  return null; // "all"
};

export const useOrderHistory = (
  organizationId: string | undefined,
  period: HistoryPeriod = "7d"
) => {
  return useQuery({
    queryKey: ["orders-history", organizationId, period],
    queryFn: async () => {
      if (!organizationId) throw new Error("No org");
      let query = supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("organization_id", organizationId)
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(500);

      const periodStart = getPeriodStart(period);
      if (periodStart) {
        query = query.gte("created_at", periodStart);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!organizationId,
  });
};
