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
import { buildPixPayload } from "@/lib/pixPayload";
import { isBluetoothSupported, requestBluetoothPrinter, reconnectStoredPrinter } from "@/lib/bluetoothPrinter";
import { toast } from "sonner";

const calcOrderTotal = (order: { order_items?: Array<{ price?: number; quantity: number }> }) =>
  (order.order_items ?? []).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

const getPixPayload = (order: { order_items?: Array<{ price?: number; quantity: number }> }, pixKey?: string | null, storeName?: string) => {
  if (!pixKey) return undefined;
  const total = calcOrderTotal(order);
  if (total <= 0) return undefined;
  return buildPixPayload(pixKey, total, storeName ?? "LOJA");
};

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

export default function KitchenPage() {
  const [searchParams] = useSearchParams();
  const orgSlug = searchParams.get("org");
  const { data: org } = useOrganization(orgSlug || undefined);

  const [pixKey, setPixKey] = useState<string | null>(null);
  useEffect(() => {
    if (!org?.id) return;
    supabase.from("organizations").select("pix_key").eq("id", org.id).maybeSingle().then(({ data }) => {
      setPixKey((data as any)?.pix_key ?? null);
    });
  }, [org?.id]);

  const { data: orders = [], isLoading } = useOrders(org?.id, ["pending", "preparing"]);
  const updateStatus = useUpdateOrderStatus(org?.id ?? "", ["pending", "preparing"]);
  const qc = useQueryClient();

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [autoPrint, setAutoPrint] = useState<boolean>(
    () => localStorage.getItem(AUTO_PRINT_KEY) !== "false"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => localStorage.getItem(NOTIF_KEY) === "true"
  );
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default")
  );

  // Bluetooth state
  const [btDevice, setBtDevice] = useState<BluetoothDevice | null>(null);
  const btConnected = btDevice?.gatt?.connected ?? false;
  const [btSupported] = useState(() => isBluetoothSupported());

  const handlePairBluetooth = async () => {
    if (!btSupported) {
      toast.error("Bluetooth não disponível", {
        description: "Abra trendfood.lovable.app no Google Chrome.",
      });
      return;
    }
    try {
      const device = await requestBluetoothPrinter();
      if (device) setBtDevice(device);
    } catch (err: any) {
      if (err?.message?.includes("globally disabled")) {
        toast.error("Bluetooth bloqueado neste navegador", {
          description: "Abra a URL publicada diretamente no Google Chrome.",
        });
      }
    }
  };

  // Auto-reconnect to previously paired Bluetooth printer on mount
  const effectPrintMode = (org as any)?.print_mode ?? "browser";
  useEffect(() => {
    if (effectPrintMode !== "bluetooth" || btDevice) return;
    let cancelled = false;
    reconnectStoredPrinter().catch(() => null).then((device) => {
      if (cancelled || !device) return;
      setBtDevice(device);
      toast.success("Impressora reconectada automaticamente");
    });
    return () => { cancelled = true; };
  }, [effectPrintMode, btDevice]);

  // Derived print settings
  const printMode = (org as any)?.print_mode ?? "browser";
  const printerWidth = org?.printer_width === "80mm" ? "80mm" : "58mm";

  const knownIds = useRef<Set<string>>(new Set());
  const pendingPrintIds = useRef<Set<string>>(new Set());
  const isPrintingRef = useRef(false);
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

  // Realtime: stable channel — uses refs to avoid restarting on toggle changes
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
            if (autoPrintRef.current) {
              pendingPrintIds.current.add(order.id);
            }
            // Web Push Notification
            if (notificationsRef.current && Notification.permission === "granted") {
              const tableLabel = order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
              new Notification(`🔔 Novo pedido! ${tableLabel}`, {
                icon: "/pwa-192.png",
                badge: "/pwa-192.png",
              });
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
  }, [org?.id, qc]); // stable — no autoPrint/notificationsEnabled deps needed

  // Print pending orders once their items are loaded (with concurrency guard)
  useEffect(() => {
    if (pendingPrintIds.current.size === 0 || isPrintingRef.current) return;
    const toPrint = orders.filter(
      (o) => pendingPrintIds.current.has(o.id) && (o.order_items?.length ?? 0) > 0
    );
    if (toPrint.length === 0) return;

    isPrintingRef.current = true;
    (async () => {
      for (const order of toPrint) {
        pendingPrintIds.current.delete(order.id);
        try {
          await printOrderByMode(order, org?.name, printMode, org?.id ?? "", btDevice, getPixPayload(order, pixKey, org?.name), printerWidth);
        } catch (err) {
          console.error("[KDS] Auto-print failed:", err);
        }
      }
      isPrintingRef.current = false;
    })();
  }, [orders, org?.name, org, btDevice, printMode, printerWidth, pixKey]);

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
          <div className="flex items-center gap-4 flex-wrap">
            {/* Push notifications toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="notif-standalone" className="text-xs text-muted-foreground cursor-pointer select-none">
                🔔 Notificações
              </Label>
              <Switch
                id="notif-standalone"
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
              <Label htmlFor="auto-print" className="text-xs text-muted-foreground cursor-pointer select-none">
                Imprimir automático
              </Label>
              <Switch
                id="auto-print"
                checked={autoPrint}
                onCheckedChange={toggleAutoPrint}
              />
            </div>
            {/* Bluetooth pairing button */}
            {printMode === "bluetooth" && (
              <Button
                variant="outline"
                size="sm"
                className={`text-xs gap-1.5 ${btConnected ? "border-green-300 text-green-700 bg-green-50" : ""}`}
                onClick={handlePairBluetooth}
                disabled={!btSupported}
              >
                <Printer className="w-3.5 h-3.5" />
                {btConnected ? "✓ Conectada" : "Parear impressora"}
              </Button>
            )}
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
                        onClick={() => {
                          printOrderByMode(order, org?.name, printMode, org?.id ?? "", btDevice, getPixPayload(order, pixKey, org?.name), printerWidth);
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
                        <span>{item.name}</span>
                        {(item as any).customer_name && (
                          <span className="text-xs text-muted-foreground">— {(item as any).customer_name}</span>
                        )}
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
