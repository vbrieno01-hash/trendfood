import { useSearchParams } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function WaiterPage() {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("org");
  const { data: org } = useOrganization(orgSlug || undefined);
  const { data: orders = [], isLoading } = useOrders(org?.id, ["ready"]);
  const updateStatus = useUpdateOrderStatus(org?.id ?? "", ["ready"]);

  if (!orgSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Adicione <code>?org=seu-slug</code> na URL.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧍</span>
            <div>
              <h1 className="font-bold text-foreground text-lg">
                Garçom {org ? `— ${org.name}` : ""}
              </h1>
              <p className="text-xs text-muted-foreground">
                {orders.length} pedido{orders.length !== 1 ? "s" : ""} pronto{orders.length !== 1 ? "s" : ""} para entrega
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ao vivo
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
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
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border-2 border-green-400 bg-card p-5 space-y-3 shadow-lg shadow-green-50"
              >
                {/* Card header */}
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

                {/* Items */}
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

                {/* Notes */}
                {order.notes && (
                  <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                  </div>
                )}

                {/* Action */}
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateStatus.mutate({ id: order.id, status: "delivered" })}
                >
                  Marcar como Entregue
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
