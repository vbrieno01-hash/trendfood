import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { enqueuePrint, cancelPendingPrints } from "@/lib/printQueue";
import { formatReceiptText, stripFormatMarkers } from "@/lib/formatReceiptText";
import type { PrintableOrder } from "@/lib/printOrder";

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
  status: "pending" | "preparing" | "ready" | "delivered" | "cancelled";
  notes: string | null;
  created_at: string;
  paid: boolean;
  payment_method?: string | null;
  order_number?: number;
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
        .select("id, organization_id, number, label")
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Realtime subscription — orders only (order_items come along via select)
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-${organizationId}-${statuses.join("-")}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTimeout(() => {
              qc.invalidateQueries({ queryKey: ["orders", organizationId] });
            }, 1500);
          } else {
            qc.invalidateQueries({ queryKey: ["orders", organizationId] });
          }
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
      // Guard: empty cart
      if (!items || items.length === 0) {
        throw new Error("Seu carrinho está vazio.");
      }

      // Pre-check: revalidate store status before inserting
      const { data: freshOrg, error: orgErr } = await supabase
        .from("organizations")
        .select("business_hours, force_open, paused")
        .eq("id", organizationId)
        .single();

      if (!orgErr && freshOrg) {
        if (freshOrg.paused) {
          throw new Error("Loja pausada no momento. Pedidos não podem ser feitos.");
        }
        if (!freshOrg.force_open && freshOrg.business_hours) {
          // Dynamic import to avoid circular deps
          const { getStoreStatus } = await import("@/lib/storeStatus");
          const bh = freshOrg.business_hours as import("@/hooks/useOrganization").BusinessHours;
          const status = getStoreStatus(bh, false);
          if (status && !status.open) {
            const msg = status.opensAt
              ? `Loja fechada no momento. Abre às ${status.opensAt}.`
              : "Loja fechada no momento. Pedidos só podem ser feitos no horário de funcionamento.";
            throw new Error(msg);
          }
        }
      }

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
      if (orderError) {
        // Map trigger error to friendly message
        if (orderError.message?.includes("Loja fechada") || orderError.message?.includes("Loja pausada")) {
          throw new Error(orderError.message);
        }
        throw orderError;
      }

      const orderItems = items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        customer_name: i.customer_name || null,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        // Rollback: delete orphan order
        await supabase.from("orders").delete().eq("id", order.id);
        throw itemsError;
      }

      // Sempre enfileirar na fila_impressao (fallback para polling caso Realtime/BLE falhe)
      try {
        const printableOrder: PrintableOrder = {
          id: order.id,
          table_number: tableNumber,
          created_at: order.created_at,
          notes: notes || null,
          order_items: items.map((i, idx) => ({
            id: `tmp-${idx}`,
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            customer_name: i.customer_name || null,
          })),
        };
        const text = stripFormatMarkers(formatReceiptText(printableOrder));
        await enqueuePrint(organizationId, order.id, text);
      } catch (err) {
        console.error("Falha ao enfileirar impressão:", err);
      }

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
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["orders", organizationId] });
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-unpaid-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTimeout(() => {
              qc.invalidateQueries({ queryKey: ["orders-unpaid", organizationId] });
            }, 1500);
          } else {
            qc.invalidateQueries({ queryKey: ["orders-unpaid", organizationId] });
          }
        }
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
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["orders-unpaid", organizationId] });
      await qc.refetchQueries({ queryKey: ["orders", organizationId] });
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`orders-awaiting-payment-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTimeout(() => {
              qc.invalidateQueries({ queryKey: ["orders-awaiting-payment", organizationId] });
            }, 1500);
          } else {
            qc.invalidateQueries({ queryKey: ["orders-awaiting-payment", organizationId] });
          }
        }
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
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["orders-awaiting-payment", organizationId] });
      await qc.refetchQueries({ queryKey: ["orders", organizationId] });
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

// ──────────────────────────────────────────────────────────────────────────────
// Cancel Order (with print queue + delivery cleanup)
// ──────────────────────────────────────────────────────────────────────────────

export const useCancelOrder = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderId: string) => {
      // 1. Update order status to cancelled
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" } as never)
        .eq("id", orderId);
      if (error) throw error;

      // 2. Cancel pending print jobs
      await cancelPendingPrints(orderId);

      // 3. Cancel associated delivery (if any)
      await supabase
        .from("deliveries")
        .update({ status: "cancelado" } as never)
        .eq("order_id", orderId)
        .in("status", ["pendente", "em_rota"]);
    },
    onSuccess: async () => {
      // Invalidate all order-related queries
      await qc.refetchQueries({ queryKey: ["orders", organizationId] });
      await qc.invalidateQueries({ queryKey: ["orders-unpaid", organizationId] });
      await qc.invalidateQueries({ queryKey: ["orders-awaiting-payment", organizationId] });
      // Invalidate courier/delivery queries so cancelled deliveries vanish from motoboy panel
      await qc.invalidateQueries({ queryKey: ["deliveries"] });
      toast({ title: "❌ Pedido cancelado com sucesso." });
    },
    onError: (e: Error) => toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" }),
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// Delete Order (permanent removal from history)
// ──────────────────────────────────────────────────────────────────────────────

export const useDeleteOrder = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Delete order_items first (cascade not automatic via RLS)
      await supabase.from("order_items").delete().eq("order_id", orderId);
      // Delete associated deliveries
      await supabase.from("deliveries").delete().eq("order_id", orderId);
      // Delete print queue entries
      await supabase.from("fila_impressao").delete().eq("order_id", orderId);
      // Delete the order itself
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders-history", organizationId] });
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
      toast({ title: "🗑️ Registro excluído do histórico." });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteOldOrders = (organizationId: string) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (daysAgo: number | null) => {
      let query = supabase
        .from("orders")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "delivered");

      if (daysAgo !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysAgo);
        query = query.lt("created_at", cutoff.toISOString());
      }

      const { data: oldOrders, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      if (!oldOrders || oldOrders.length === 0) throw new Error("__EMPTY__");

      const ids = oldOrders.map((o) => o.id);

      for (const id of ids) {
        await supabase.from("order_items").delete().eq("order_id", id);
        await supabase.from("deliveries").delete().eq("order_id", id);
        await supabase.from("fila_impressao").delete().eq("order_id", id);
      }

      const { error } = await supabase.from("orders").delete().in("id", ids);
      if (error) throw error;

      return ids.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["orders-history", organizationId] });
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
      toast({ title: `🗑️ ${count} registros excluídos.` });
    },
    onError: (e: Error) => {
      if (e.message === "__EMPTY__") {
        toast({
          title: "⚠️ Nenhum pedido encontrado para o período selecionado.",
          className: "border-yellow-400 bg-yellow-50 text-yellow-900 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-200",
        });
      } else {
        toast({ title: "Erro ao limpar histórico", description: e.message, variant: "destructive" });
      }
    },
  });
};
