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
}

export interface Order {
  id: string;
  organization_id: string;
  table_number: number;
  status: "pending" | "preparing" | "ready" | "delivered";
  notes: string | null;
  created_at: string;
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
          qc.invalidateQueries({ queryKey: ["orders", organizationId, statuses] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", organizationId, statuses] });
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
    }: {
      organizationId: string;
      tableNumber: number;
      notes: string;
      items: { menu_item_id: string; name: string; price: number; quantity: number }[];
    }) => {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ organization_id: organizationId, table_number: tableNumber, notes: notes || null })
        .select()
        .single();
      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
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
      qc.invalidateQueries({ queryKey: ["orders", organizationId, statuses] });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};
