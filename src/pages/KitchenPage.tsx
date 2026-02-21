import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrders, useUpdateOrderStatus, Order } from "@/hooks/useOrders";
import { createDeliveryForOrder } from "@/hooks/useCreateDelivery";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { printOrderByMode } from "@/lib/printOrder";

// Web Audio API bell sound (no external dependency)
const playBell = () => {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const times = [0, 0.3, 0.6];
    times.forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime + t);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + t + 0.4);
      gain.gain.setValueAtTime(0.5, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.5);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.5);
    });
  } catch {
    // Audio not available
  }
};

const isNew = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() < 30_000;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const AUTO_PRINT_KEY = "kds_auto_print";

export default function KitchenPage() {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("org");
  const { data: org } = useOrganization(orgSlug || undefined);
  const { data: orders = [], isLoading } = useOrders(org?.id, ["pending", "preparing"]);
  const updateStatus = useUpdateOrderStatus(org?.id ?? "", ["pending", "preparing"]);
  const qc = useQueryClient();

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [autoPrint, setAutoPrint] = useState<boolean>(
    () => localStorage.getItem(AUTO_PRINT_KEY) !== "false"
  );

  const knownIds = useRef<Set<string>>(new Set());
  const pendingPrintIds = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);

  const toggleAutoPrint = (val: boolean) => {
    setAutoPrint(val);
    localStorage.setItem(AUTO_PRINT_KEY, String(val));
  };

  const handleUpdateStatus = (id: string, status: Order["status"], order?: Order) => {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          if (status === "ready" && order && order.table_number === 0) {
            createDeliveryForOrder(order, org?.id ?? "", org?.store_address, org?.courier_config);
          }
        },
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

  // Realtime: bell on new orders + visual update on status changes
  useEffect(() => {
    if (!org?.id) return;
    const channel = supabase
      .channel(`kitchen-bell-${org.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `organization_id=eq.${org.id}` },
        (payload) => {
          const order = payload.new as Order;
          if (!knownIds.current.has(order.id)) {
            knownIds.current.add(order.id);
            playBell();
            // Queue for auto-print after items load
            if (autoPrint) {
              pendingPrintIds.current.add(order.id);
            }
            qc.invalidateQueries({ queryKey: ["orders", org.id, ["pending", "preparing"]] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `organization_id=eq.${org.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", org.id, ["pending", "preparing"]] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [org?.id, qc, autoPrint]);

  // Print pending orders once their items are loaded
  useEffect(() => {
    if (pendingPrintIds.current.size === 0) return;
    const pw = org?.printer_width === '80mm' ? '80mm' : '58mm';
    const pm = (org as any)?.print_mode ?? 'browser';
    orders.forEach((order) => {
      if (pendingPrintIds.current.has(order.id) && (order.order_items?.length ?? 0) > 0) {
        pendingPrintIds.current.delete(order.id);
        printOrderByMode(order, org?.name, pm, org?.id ?? '', null, undefined, pw);
      }
    });
  }, [orders, org?.name, org]);

  // Mark existing orders as known when first loaded
  useEffect(() => {
    orders.forEach((o) => knownIds.current.add(o.id));
  }, [orders]);

  // Re-render every 5s to refresh "NOVO!" badge countdown
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

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
            <span className="text-2xl">🍳</span>
            <div>
              <h1 className="font-bold text-foreground text-lg">
                Cozinha {org ? `— ${org.name}` : ""}
              </h1>
              <p className="text-xs text-muted-foreground">
                {orders.length} pedido{orders.length !== 1 ? "s" : ""} aguardando
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-print toggle */}
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="auto-print" className="text-xs text-muted-foreground cursor-pointer select-none">
                Imprimir automático
              </Label>
              <Switch
                id="auto-print"
                checked={autoPrint}
                onCheckedChange={toggleAutoPrint}
              />
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              ao vivo
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {isLoading ? (
          <p className="text-muted-foreground animate-pulse text-center py-12">Carregando pedidos…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✅</p>
            <p className="font-semibold text-foreground text-lg">Nenhum pedido pendente!</p>
            <p className="text-muted-foreground text-sm mt-1">Novos pedidos aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => {
              const isOrderNew = isNew(order.created_at);
              const isOrderLoading = loadingIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 bg-card p-5 space-y-3 transition-all ${
                    isOrderNew ? "border-orange-400 shadow-lg shadow-orange-100" : "border-border"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOrderNew && (
                          <span className="text-xs font-bold bg-orange-500 text-white rounded-full px-2 py-0.5 animate-pulse">
                            NOVO!
                          </span>
                        )}
                        <span className="font-bold text-foreground text-lg">{order.table_number === 0 ? "🛵 ENTREGA" : `Mesa ${order.table_number}`}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Imprimir pedido"
                        onClick={() => {
                          const pw = org?.printer_width === '80mm' ? '80mm' : '58mm';
                          const pm = (org as any)?.print_mode ?? 'browser';
                          printOrderByMode(order, org?.name, pm, org?.id ?? '', null, undefined, pw);
                        }}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        order.status === "preparing"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {order.status === "preparing" ? "Em Preparo" : "Pendente"}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <ul className="space-y-1">
                    {(order.order_items ?? []).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                        <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
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

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {order.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        disabled={isOrderLoading}
                        onClick={() => handleUpdateStatus(order.id, "preparing", order)}
                      >
                        {isOrderLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Iniciar preparo"
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      disabled={isOrderLoading}
                      onClick={() => handleUpdateStatus(order.id, "ready", order)}
                    >
                      {isOrderLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "✓ Marcar como Pronto"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
