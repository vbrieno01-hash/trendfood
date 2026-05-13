import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockAlert {
  id: string;
  organization_id: string;
  order_id: string | null;
  order_number: number | null;
  stock_item_id: string | null;
  stock_item_name: string;
  menu_item_name: string | null;
  requested_qty: number;
  available_qty: number;
  shortage: number;
  acknowledged: boolean;
  created_at: string;
  acknowledged_at: string | null;
}

export function useStockAlerts(orgId: string | undefined, onlyPending = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`stock_alerts-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_alerts", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["stock_alerts", orgId] });
          if (payload.eventType === "INSERT") {
            const row: any = payload.new;
            toast.error(
              `⚠️ Estoque insuficiente: faltaram ${Number(row.shortage).toLocaleString("pt-BR")} de "${row.stock_item_name}"${row.order_number ? ` (pedido #${row.order_number})` : ""}.`,
              { duration: 10000 }
            );
            try {
              const a = new Audio("/notification.mp3");
              a.volume = 0.8;
              a.play().catch(() => {});
            } catch {}
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["stock_alerts", orgId, onlyPending],
    queryFn: async () => {
      if (!orgId) return [];
      let q = supabase
        .from("stock_alerts")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (onlyPending) q = q.eq("acknowledged", false);
      const { data, error } = await q;
      if (error) throw error;
      return data as StockAlert[];
    },
    enabled: !!orgId,
    staleTime: 0,
  });
}

export function useAcknowledgeStockAlert(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stock_alerts")
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_alerts", orgId] });
      toast.success("Alerta resolvido.");
    },
    onError: () => toast.error("Erro ao resolver alerta."),
  });
}

export function useAcknowledgeAllStockAlerts(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("stock_alerts")
        .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("acknowledged", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_alerts", orgId] });
      toast.success("Todos os alertas foram marcados como resolvidos.");
    },
    onError: () => toast.error("Erro ao resolver alertas."),
  });
}