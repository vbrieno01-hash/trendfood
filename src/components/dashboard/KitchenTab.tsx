import { useEffect, useRef, useState } from "react";
import { useOrders, useUpdateOrderStatus, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Flame, Printer } from "lucide-react";
import { printOrder } from "@/lib/printOrder";
import { toast } from "sonner";

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
const NOTIF_KEY = "kds_notifications";

interface KitchenTabProps {
  orgId: string;
  orgName?: string;
  pixKey?: string | null;
}

export default function KitchenTab({ orgId, orgName, pixKey }: KitchenTabProps) {
  const { data: orders = [], isLoading } = useOrders(orgId, ["pending", "preparing"]);
  const updateStatus = useUpdateOrderStatus(orgId, ["pending", "preparing"]);
  const qc = useQueryClient();

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [autoPrint, setAutoPrint] = useState<boolean>(
    () => localStorage.getItem(AUTO_PRINT_KEY) !== "false"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => localStorage.getItem(NOTIF_KEY) === "true"
  );
  // Track browser permission state for badge display
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default")
  );

  const knownIds = useRef<Set<string>>(new Set());
  const pendingPrintIds = useRef<Set<string>>(new Set());
  const [, forceRender] = useState(0);

  // Stable refs so the Realtime channel never needs to restart when toggles change
  const autoPrintRef = useRef(autoPrint);
  const notificationsRef = useRef(notificationsEnabled);

  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);
  useEffect(() => { notificationsRef.current = notificationsEnabled; }, [notificationsEnabled]);

  const toggleAutoPrint = (val: boolean) => {
    setAutoPrint(val);
    localStorage.setItem(AUTO_PRINT_KEY, String(val));
  };

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === "denied") {
        toast.error("Notificações bloqueadas pelo navegador", {
          description: "Clique no cadeado na barra de endereço e permita notificações para este site.",
          duration: 8000,
        });
        return;
      }
      if (permission !== "granted") {
        toast.warning("Permissão de notificação não concedida.");
        return;
      }
    }
    setNotificationsEnabled(val);
    localStorage.setItem(NOTIF_KEY, String(val));
  };

  const handleUpdateStatus = (id: string, status: Order["status"]) => {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    updateStatus.mutate(
      { id, status },
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

  // Realtime: stable channel — uses refs to avoid restarting on toggle changes
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`kitchen-tab-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const order = payload.new as Order;
          if (!knownIds.current.has(order.id)) {
            knownIds.current.add(order.id);
            playBell();
            if (autoPrintRef.current) {
              pendingPrintIds.current.add(order.id);
            }
            // Web Push Notification — uses ref, no channel restart needed
            if (notificationsRef.current && Notification.permission === "granted") {
              const tableLabel = order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
              new Notification(`🔔 Novo pedido! ${tableLabel}`, {
                icon: "/pwa-192.png",
                badge: "/pwa-192.png",
              });
            }
            qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]); // stable — no autoPrint/notificationsEnabled deps needed

  // Print pending orders once their items are loaded
  useEffect(() => {
    if (pendingPrintIds.current.size === 0) return;
    orders.forEach((order) => {
      if (pendingPrintIds.current.has(order.id) && (order.order_items?.length ?? 0) > 0) {
        pendingPrintIds.current.delete(order.id);
        printOrder(order, orgName, pixKey);
      }
    });
  }, [orders, orgName, pixKey]);

  // Mark existing orders as known when first loaded
  useEffect(() => {
    orders.forEach((o) => knownIds.current.add(o.id));
  }, [orders]);

  // Re-render every 5s to refresh "NOVO!" badge countdown
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-foreground text-xl">Cozinha (KDS)</h2>
          <span className="ml-1 text-sm text-muted-foreground">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} aguardando
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Push notifications toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="notif-tab" className="text-xs text-muted-foreground cursor-pointer select-none">
              🔔 Notificações
            </Label>
            <Switch
              id="notif-tab"
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
            />
            {notificationsEnabled && notifPermission === "granted" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                Ativo
              </span>
            )}
            {notifPermission === "denied" && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                Bloqueado
              </span>
            )}
          </div>
          {/* Auto-print toggle */}
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="auto-print-tab" className="text-xs text-muted-foreground cursor-pointer select-none">
              Imprimir automático
            </Label>
            <Switch
              id="auto-print-tab"
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
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isOrderNew && (
                        <span className="text-xs font-bold bg-orange-500 text-white rounded-full px-2 py-0.5 animate-pulse">
                          NOVO!
                        </span>
                      )}
                      <span className="font-bold text-foreground text-lg">{order.table_number === 0 ? "🛵 ENTREGA" : `Mesa ${order.table_number}`}</span>
                      {(order as any).payment_method && (order as any).payment_method !== "pending" && (
                        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                          (order as any).payment_method === "pix" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {(order as any).payment_method === "pix" ? "PIX" : "Cartão"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title="Imprimir pedido"
                      onClick={() => printOrder(order, orgName, pixKey)}
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

                <ul className="space-y-1">
                  {(order.order_items ?? []).map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm text-foreground">
                      <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {item.quantity}×
                      </span>
                      <span>{item.name}</span>
                      {(item as any).customer_name && (
                        <span className="text-xs text-muted-foreground">— {(item as any).customer_name}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {order.notes && (
                  <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Obs:</span> {order.notes}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {order.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={isOrderLoading}
                      onClick={() => handleUpdateStatus(order.id, "preparing")}
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
                    onClick={() => handleUpdateStatus(order.id, "ready")}
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
    </div>
  );
}
