import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentOrder {
  id: string;
  table_number: number;
  status: string;
  paid: boolean;
  created_at: string;
  organization_id: string;
  org_name: string;
  org_emoji: string;
  total: number;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  preparing: { label: "Preparando", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  ready: { label: "Pronto", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
  delivered: { label: "Entregue", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RecentOrdersFeed({ orgMap }: { orgMap: Record<string, { name: string; emoji: string }> }) {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const ordersRef = useRef<RecentOrder[]>([]);

  async function fetchOrders() {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, table_number, status, paid, created_at, organization_id, order_items(price, quantity)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!ordersData) return;

    const mapped: RecentOrder[] = ordersData.map((o) => {
      const info = orgMap[o.organization_id] ?? { name: "Desconhecida", emoji: "🍽️" };
      const total = ((o.order_items as { price: number; quantity: number }[]) ?? []).reduce(
        (s, i) => s + i.price * i.quantity, 0
      );
      return {
        id: o.id,
        table_number: o.table_number,
        status: o.status,
        paid: o.paid,
        created_at: o.created_at,
        organization_id: o.organization_id,
        org_name: info.name,
        org_emoji: info.emoji,
        total,
      };
    });

    ordersRef.current = mapped;
    setOrders(mapped);
    setLoading(false);
  }

  useEffect(() => {
    if (Object.keys(orgMap).length === 0) return;
    fetchOrders();

    const channel = supabase
      .channel("admin-orders-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgMap]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Pedidos Recentes (Todas as Lojas)
        </h2>
        <button onClick={fetchOrders} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhum pedido encontrado.</div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {orders.map((order) => {
              const st = STATUS_LABELS[order.status] ?? { label: order.status, className: "bg-muted text-muted-foreground" };
              return (
                <div key={order.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                  <span className="text-lg shrink-0">{order.org_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{order.org_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Mesa {order.table_number} · {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground shrink-0">{fmt(order.total)}</span>
                  <Badge className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium shrink-0 ${st.className}`}>
                    {st.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
