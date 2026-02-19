import { useState } from "react";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { BellRing, Loader2 } from "lucide-react";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

interface WaiterTabProps {
  orgId: string;
}

export default function WaiterTab({ orgId }: WaiterTabProps) {
  const { data: orders = [], isLoading } = useOrders(orgId, ["ready"]);
  const updateStatus = useUpdateOrderStatus(orgId, ["ready"]);

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const handleDeliver = (id: string) => {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    updateStatus.mutate(
      { id, status: "delivered" },
      {
        onSettled: () => {
          setTimeout(() => {
            setLoadingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 1000);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-green-600" />
          <h2 className="font-bold text-foreground text-xl">Painel do Garçom</h2>
          <span className="ml-1 text-sm text-muted-foreground">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} pronto{orders.length !== 1 ? "s" : ""} para entrega
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          ao vivo
        </span>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground animate-pulse text-center py-12">Carregando…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛎️</p>
          <p className="font-semibold text-foreground text-lg">Nenhum pedido pronto!</p>
          <p className="text-muted-foreground text-sm mt-1">
            Os pedidos prontos aparecerão aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((order) => {
            const isOrderLoading = loadingIds.has(order.id);
            return (
              <div
                key={order.id}
                className="rounded-2xl border-2 border-green-400 bg-card p-5 space-y-3 shadow-lg shadow-green-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-green-500 text-white rounded-full px-2.5 py-0.5">
                        ✅ PRONTO
                      </span>
                      <span className="font-bold text-foreground text-lg">Mesa {order.table_number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                  </div>
                </div>

                <ul className="space-y-1">
                  {(order.order_items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-6 h-6 rounded-md bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.quantity}×
                      </span>
                      {item.name}
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                  </div>
                )}

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={isOrderLoading}
                  onClick={() => handleDeliver(order.id)}
                >
                  {isOrderLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Marcar como Entregue"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
