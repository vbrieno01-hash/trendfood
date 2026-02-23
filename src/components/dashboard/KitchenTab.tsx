import { useEffect, useState } from "react";
import { useOrders, useUpdateOrderStatus, Order } from "@/hooks/useOrders";
import { createDeliveryForOrder } from "@/hooks/useCreateDelivery";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Flame, Printer } from "lucide-react";
import { printOrderByMode } from "@/lib/printOrder";
import { buildPixPayload } from "@/lib/pixPayload";
import { toast } from "sonner";

const isNew = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() < 30_000;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const NOTIF_KEY = "kds_notifications";

interface KitchenTabProps {
  orgId: string;
  orgName?: string;
  storeAddress?: string | null;
  courierConfig?: { base_fee: number; per_km: number } | null;
  printMode?: 'browser' | 'desktop' | 'bluetooth';
  printerWidth?: '58mm' | '80mm';
  btDevice?: BluetoothDevice | null;
  pixKey?: string | null;
  onPairBluetooth?: () => void;
  btConnected?: boolean;
  btSupported?: boolean;
  // Auto-print state controlled by DashboardPage
  autoPrint: boolean;
  onToggleAutoPrint: (val: boolean) => void;
  // Notifications state controlled by DashboardPage
  notificationsEnabled: boolean;
  onToggleNotifications: (val: boolean) => void;
}

const calcOrderTotal = (order: { order_items?: Array<{ price?: number; quantity: number }> }) =>
  (order.order_items ?? []).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

const getPixPayload = (order: { order_items?: Array<{ price?: number; quantity: number }> }, pixKey?: string | null, storeName?: string) => {
  if (!pixKey) return undefined;
  const total = calcOrderTotal(order);
  if (total <= 0) return undefined;
  return buildPixPayload(pixKey, total, storeName ?? "LOJA");
};

export default function KitchenTab({
  orgId, orgName, storeAddress, courierConfig,
  printMode = 'browser', printerWidth = '58mm', btDevice = null, pixKey,
  onPairBluetooth, btConnected, btSupported,
  autoPrint, onToggleAutoPrint,
  notificationsEnabled, onToggleNotifications,
}: KitchenTabProps) {
  const { data: orders = [], isLoading } = useOrders(orgId, ["pending", "preparing"]);
  const updateStatus = useUpdateOrderStatus(orgId, ["pending", "preparing"]);
  const qc = useQueryClient();

  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Track browser permission state for badge display
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default")
  );

  const [, forceRender] = useState(0);

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      // Detect native platform (Capacitor APK)
      let isNative = false;
      try {
        const { Capacitor } = await import("@capacitor/core");
        isNative = Capacitor.isNativePlatform();
      } catch { /* not native */ }

      if (isNative) {
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const result = await LocalNotifications.requestPermissions();
          if (result.display === "denied") {
            toast.error("Notificações bloqueadas", {
              description: "Ative as notificações nas configurações do app.",
              duration: 8000,
            });
            return;
          }
          setNotifPermission("granted");
        } catch (err) {
          console.warn("[Notif] Native permission request failed:", err);
          toast.error("Erro ao solicitar permissão de notificações.");
          return;
        }
      } else {
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
    }
    onToggleNotifications(val);
  };

  const handleUpdateStatus = (id: string, status: Order["status"], order?: Order) => {
    if (loadingIds.has(id)) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => {
          if (status === "ready" && order && order.table_number === 0) {
            createDeliveryForOrder(order, orgId, storeAddress, courierConfig);
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

  // Realtime: listen for all order changes (INSERT + UPDATE + DELETE)
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`kitchen-tab-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

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
              onCheckedChange={handleToggleNotifications}
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
              onCheckedChange={onToggleAutoPrint}
            />
          </div>
          {/* Bluetooth pairing button */}
          {printMode === "bluetooth" && onPairBluetooth && (
            <Button
              variant="outline"
              size="sm"
              className={`text-xs gap-1.5 ${btConnected ? "border-green-300 text-green-700 bg-green-50" : ""} ${!btSupported ? "opacity-50" : ""}`}
              onClick={() => {
                if (!btSupported) {
                  const isBrave = !!(navigator as any).brave;
                  toast.error(
                    isBrave ? "Bluetooth desativado no Brave" : "Bluetooth não disponível",
                    {
                      description: isBrave
                        ? "Ative em brave://flags/#enable-web-bluetooth e recarregue a página."
                        : "Seu navegador não suporta Web Bluetooth. Use Chrome, Edge ou Opera.",
                      duration: 8000,
                    }
                  );
                  return;
                }
                onPairBluetooth?.();
              }}
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
                      onClick={() => printOrderByMode(order, orgName, printMode, orgId, btDevice, getPixPayload(order, pixKey, orgName), printerWidth)}
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
    </div>
  );
}
