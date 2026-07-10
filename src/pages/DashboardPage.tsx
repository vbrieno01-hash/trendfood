import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import OrgSwitcher from "@/components/dashboard/OrgSwitcher";
import CreateUnitDialog from "@/components/dashboard/CreateUnitDialog";
import DeleteUnitDialog from "@/components/dashboard/DeleteUnitDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useOrders, Order } from "@/hooks/useOrders";
import { printOrderByMode } from "@/lib/printOrder";
import { buildPixPayload } from "@/lib/pixPayload";
import { getPublicBaseUrl, getPublicHost } from "@/lib/publicUrl";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Home, Store, Settings, LogOut, ExternalLink,
  Menu, UtensilsCrossed, TableProperties, Flame, BellRing,
  History, Tag, BarChart2, Wallet, Lock, Rocket, AlertTriangle, Zap,
  BookOpen, Sparkles, FileBarChart, Printer, Bike, Package, Gift, MessageCircle,
  Calculator, Send, ShoppingCart,
  Star, Search,
} from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradePrompt from "@/components/dashboard/UpgradePrompt";
import UpgradeDialog from "@/components/dashboard/UpgradeDialog";
import { useFcmToken } from "@/hooks/useFcmToken";
import { useOrgAddon } from "@/hooks/useOrgAddon";

import ThemeToggle from "@/components/ThemeToggle";
import { requestBluetoothPrinter, disconnectPrinter, isBluetoothSupported, reconnectStoredPrinter, autoReconnect, connectToDevice, getBluetoothStatus, getBtUnsupportedMessage, getStoredDeviceId } from "@/lib/bluetoothPrinter";

// Lazy-loaded tabs — cada aba vira um chunk separado, baixado sob demanda.
// Reduz o bundle inicial do dashboard drasticamente.
const HomeTab = lazy(() => import("@/components/dashboard/HomeTab"));
const MenuTab = lazy(() => import("@/components/dashboard/MenuTab"));
const TablesTab = lazy(() => import("@/components/dashboard/TablesTab"));
const StoreProfileTab = lazy(() => import("@/components/dashboard/StoreProfileTab"));
const SettingsTab = lazy(() => import("@/components/dashboard/SettingsTab"));
const HistoryTab = lazy(() => import("@/components/dashboard/HistoryTab"));
const CouponsTab = lazy(() => import("@/components/dashboard/CouponsTab"));
const BestSellersTab = lazy(() => import("@/components/dashboard/BestSellersTab"));
const CaixaTab = lazy(() => import("@/components/dashboard/CaixaTab"));
const FeaturesTab = lazy(() => import("@/components/dashboard/FeaturesTab"));
const GuideTab = lazy(() => import("@/components/dashboard/GuideTab"));
const ReportsTab = lazy(() => import("@/components/dashboard/ReportsTab"));
const CourierDashboardTab = lazy(() => import("@/components/dashboard/CourierDashboardTab"));
const PrinterTab = lazy(() => import("@/components/dashboard/PrinterTab"));
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
const SubscriptionTab = lazy(() => import("@/components/dashboard/SubscriptionTab"));
const StockTab = lazy(() => import("@/components/dashboard/StockTab"));
const PricingTab = lazy(() => import("@/components/dashboard/PricingTab"));
const ReferralSection = lazy(() => import("@/components/dashboard/ReferralSection"));
import { usePlatformContent } from "@/hooks/usePlatformContent";
const ReviewsTab = lazy(() => import("@/components/dashboard/ReviewsTab"));
const LoyaltyTab = lazy(() => import("@/components/dashboard/LoyaltyTab"));
const OperationsTab = lazy(() => import("@/components/dashboard/OperationsTab"));
const IFoodTab = lazy(() => import("@/components/dashboard/IFoodTab"));
const TelegramTab = lazy(() => import("@/components/dashboard/TelegramTab"));
const AIBotTab = lazy(() => import("@/components/dashboard/AIBotTab"));
const CounterTab = lazy(() => import("@/components/dashboard/CounterTab"));
const FiscalTab = lazy(() => import("@/components/dashboard/FiscalTab"));
const CampaignsTab = lazy(() => import("@/components/dashboard/CampaignsTab"));
const IntelligenceTab = lazy(() => import("@/components/dashboard/IntelligenceTab"));
import DashboardTour from "@/components/dashboard/DashboardTour";
import { useVersionHeartbeat } from "@/hooks/useVersionHeartbeat";
import { usePlatformFeatureFlags } from "@/hooks/usePlatformFeatureFlags";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


type TabKey = "home" | "menu" | "tables" | "operations" | "kitchen" | "waiter" | "profile" | "settings" | "history" | "coupons" | "bestsellers" | "caixa" | "features" | "guide" | "reports" | "courier" | "printer" | "subscription" | "stock" | "referral" | "pricing" | "reviews" | "loyalty" | "ifood" | "telegram" | "aibot" | "counter" | "fiscal" | "campaigns" | "intelligence";

const DashboardPage = () => {
  console.log("[Dashboard] Mount");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, organization, organizations, isAdmin, loading, signOut, refreshOrganizationForUser, refreshOrganization, switchOrganization } = useAuth();
  const { data: featureFlags } = usePlatformFeatureFlags();
  const IFOOD_BETA_EMAILS = ["vendass945@gmail.com"];
  const ifoodBetaUser = !!user?.email && IFOOD_BETA_EMAILS.includes(user.email.toLowerCase());
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [deleteUnit, setDeleteUnit] = useState<{ id: string; name: string } | null>(null);
  const { data: aiBotAddon, isLoading: aiBotAddonLoading } = useOrgAddon(organization?.id, "ai_bot");
  const planLimits = usePlanLimits(organization, aiBotAddon);
  const { content: platformContent } = usePlatformContent();
  const communityWhatsAppUrl =
    (typeof platformContent.community_whatsapp_url === "string" && platformContent.community_whatsapp_url.trim()) ||
    "https://chat.whatsapp.com/EfyhyGDZPceEcIcu0gb8yq?mode=gi_t";

  // Heartbeat: registra qual versão essa loja está rodando (admin → painel Versões)
  useVersionHeartbeat(organization?.id);
  // Read tab from URL query param, fallback to location.state, then localStorage, then "home"
  const getInitialTab = (): TabKey => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab") as TabKey | null;
    const tabFromState = (location.state as { tab?: string })?.tab as TabKey | null;
    const _tabFromStorage = localStorage.getItem("dashboard_active_tab") as TabKey | null;
    const raw = tabFromUrl || tabFromState || "home";
    // Legacy redirects
    if (raw === "kitchen" || raw === "waiter") return "operations";
    return raw;
  };
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);

  // Persist active tab to localStorage for Android WebView recovery
  useEffect(() => {
    localStorage.setItem("dashboard_active_tab", activeTab);
  }, [activeTab]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const retryRef = useRef(false);
  

  // Prevent accidental exit via swipe-back gesture
  useEffect(() => {
    // Push a "guard" entry so the first back gesture stays on dashboard
    if (!window.history.state?._dashGuard) {
      window.history.replaceState({ _dashGuard: true }, "");
      window.history.pushState({ _dashGuard: true }, "");
    }
    const onPopState = () => {
      // Re-push to prevent leaving dashboard
      window.history.pushState({ _dashGuard: true }, "");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);


  // Bluetooth state lifted from SettingsTab
  const [btDevice, setBtDevice] = useState<any>(null);
  const [btConnected, setBtConnected] = useState(false);
  const [btReconnectFailed, setBtReconnectFailed] = useState(false);
  const btSupported = (() => { try { return isBluetoothSupported(); } catch { return false; } })();

  // ── isReady: delays heavy operations 500ms after auth is fully resolved ──
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading || !user || !organization) return;
    console.log("[Dashboard] Auth loaded, user:", !!user, "org:", !!organization);
    const timer = setTimeout(() => {
      setIsReady(true);
      console.log("[Dashboard] isReady activated");
    }, 500);
    return () => clearTimeout(timer);
  }, [loading, user, organization]);

  // Push notifications (native only) — guarded by isReady
  // Push notifications removed (was native only)

  // ── Global auto-print + notifications (always mounted) ──
  const AUTO_PRINT_KEY = "kds_auto_print";
  const NOTIF_KEY_DASH = "kds_notifications";
  const qc = useQueryClient();

  const [autoPrint, setAutoPrint] = useState<boolean>(
    () => localStorage.getItem(AUTO_PRINT_KEY) !== "false"
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    () => localStorage.getItem(NOTIF_KEY_DASH) === "true"
  );

  const orgId = organization?.id;
  const orgName = organization?.name;

  // Registra o dispositivo (APK Android ou navegador) no FCM para receber
  // notificações de novo pedido / cancelamento / estoque mesmo com o app fechado.
  useFcmToken(orgId, user?.id);
  const printMode = (organization as any)?.print_mode ?? "browser";
  const printerWidth = (organization as any)?.printer_width ?? "58mm";
  const pixKey = (organization as any)?.pix_key;
  const _storeAddress = organization?.store_address;
  const _courierConfig = (organization as any)?.courier_config;

  const autoPrintRef = useRef(autoPrint);
  const notificationsRef = useRef(notificationsEnabled);
  const knownIds = useRef<Set<string>>(new Set());
  const autoPrintedIds = useRef<Set<string>>(new Set());

  // Refs for values used inside Realtime callback (avoids stale closures)
  const printModeRef = useRef(printMode);
  const orgNameRef = useRef(orgName);
  const printerWidthRef = useRef(printerWidth);
  const pixKeyRef = useRef(pixKey);
  const btDeviceRef = useRef(btDevice);

  // Print queue instead of isPrintingRef lock
  const printQueue = useRef<Array<() => Promise<void>>>([]);
  const isProcessingQueue = useRef(false);

  const processQueue = async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;
    while (printQueue.current.length > 0) {
      const job = printQueue.current.shift()!;
      try { await job(); } catch (err) {
        console.error("[Dashboard] Auto-print failed:", err);
      }
    }
    isProcessingQueue.current = false;
  };

  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);
  useEffect(() => { notificationsRef.current = notificationsEnabled; }, [notificationsEnabled]);
  useEffect(() => { printModeRef.current = printMode; }, [printMode]);
  useEffect(() => { orgNameRef.current = orgName; }, [orgName]);
  useEffect(() => { printerWidthRef.current = printerWidth; }, [printerWidth]);
  useEffect(() => { pixKeyRef.current = pixKey; }, [pixKey]);
  useEffect(() => { btDeviceRef.current = btDevice; }, [btDevice]);

  // Fetch orders at dashboard level for auto-print
  const { data: dashOrders = [] } = useOrders(orgId, ["pending", "preparing"]);

  // playBell
  const playBell = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      [0, 0.3, 0.6].forEach((t) => {
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
    } catch { /* audio not available */ }
  };

  const calcOrderTotal = (order: { order_items?: Array<{ price?: number; quantity: number }> }) =>
    (order.order_items ?? []).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  const getPixPayload = (order: { order_items?: Array<{ price?: number; quantity: number }> }) => {
    const key = pixKeyRef.current;
    if (!key) return undefined;
    const total = calcOrderTotal(order);
    if (total <= 0) return undefined;
    return buildPixPayload(key, total, orgNameRef.current ?? "LOJA");
  };

  // Realtime: listen for new orders globally — print directly in callback
  useEffect(() => {
    if (!orgId || !isReady) return;
    console.log("[Dashboard] Realtime channel created for org:", orgId);
    const channel = supabase
      .channel(`dashboard-autoprint-${orgId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const order = payload.new as Order;

          // Auto-print: usa set proprio para deduplicacao (independente de knownIds)
          if (autoPrintRef.current && !autoPrintedIds.current.has(order.id)) {
            autoPrintedIds.current.add(order.id);
            console.log("[AutoPrint] Novo pedido detectado:", order.id, "mesa:", order.table_number);

            // Modo cabo (desktop): o job já foi criado em placeOrder e o robô local vai puxar.
            // Não enfileirar de novo aqui para evitar reimpressão duplicada.
            if (printModeRef.current === "desktop" && !btDeviceRef.current) {
              console.log("[AutoPrint] modo desktop — robô local cuida da impressão, pulando.");
            } else {
            printQueue.current.push(async () => {
              // Retry up to 3 times with 1.5s delay to wait for order_items (race condition fix)
              let items: any[] = [];
              for (let attempt = 0; attempt < 3; attempt++) {
                if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
                const { data } = await supabase
                  .from("order_items")
                  .select("id, name, quantity, price, customer_name")
                  .eq("order_id", order.id);
                items = data ?? [];
                if (items.length > 0) break;
              }
              if (items.length === 0) {
                console.warn("[AutoPrint] Pedido sem itens após 3 tentativas:", order.id);
                return; // Don't print empty receipt
              }
              const fullOrder = { ...order, order_items: items };

              // Web: reconexao sob demanda
              if (!btDeviceRef.current && getStoredDeviceId()) {
                try {
                  const reconnected = await reconnectStoredPrinter();
                  if (reconnected) {
                    setBtDevice(reconnected);
                    setBtConnected(true);
                    btDeviceRef.current = reconnected;
                    attachDisconnectHandler(reconnected);
                    console.log("[AutoPrint] Bluetooth reconnected on-demand");
                  }
                } catch {
                  console.warn("[AutoPrint] On-demand BT reconnect failed");
                }
              }

              const effectiveMode = (btDeviceRef.current || getStoredDeviceId())
                ? 'bluetooth' as const
                : printModeRef.current;

              console.log("[AutoPrint] Imprimindo pedido", order.id, "modo:", effectiveMode, "btDevice:", !!btDeviceRef.current);

              await printOrderByMode(
                fullOrder,
                orgNameRef.current,
                effectiveMode,
                orgId!,
                btDeviceRef.current,
                getPixPayload(fullOrder),
                printerWidthRef.current,
                false,
                !!(organization as any)?.ifood_courier_copy,
              );

              // Marcar job na fila_impressao como impresso para evitar reimpressão pelo polling
              try {
                await supabase
                  .from("fila_impressao")
                  .update({ status: "impresso", printed_at: new Date().toISOString() } as any)
                  .eq("order_id", order.id)
                  .eq("organization_id", orgId)
                  .eq("status", "pendente");
              } catch { /* silently ignore */ }
            });
            processQueue();
            }
          }

          // Bell + notificacao: usa knownIds para nao repetir
          if (knownIds.current.has(order.id)) return;
          knownIds.current.add(order.id);

          playBell();

          if (notificationsRef.current) {
            const tableLabel = order.table_number === -1 ? "Balcão" : order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`🔔 Novo pedido! ${tableLabel}`, {
                icon: "/pwa-192.png",
                badge: "/pwa-192.png",
              });
            }
          }

          qc.invalidateQueries({ queryKey: ["orders", orgId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc, isReady]);

  // (Auto-print useEffect removed — printing now happens directly in Realtime callback above)

  

  useEffect(() => {
    dashOrders.forEach((o) => {
      knownIds.current.add(o.id);
      autoPrintedIds.current.add(o.id);
    });
  }, [dashOrders]);
  // Stable disconnect handler ref to allow proper removeEventListener
  const disconnectHandlerRef = useRef<(() => void) | null>(null);

  const attachDisconnectHandler = (device: any) => {
    // Remove previous listener if exists
    if (disconnectHandlerRef.current) {
      device.removeEventListener("gattserverdisconnected", disconnectHandlerRef.current);
    }
    const handler = () => {
      console.log("[BT] gattserverdisconnected event — starting auto-reconnect");
      setBtConnected(false);
      autoReconnect(
        device,
        () => {
          setBtConnected(true);
          toast.success("Impressora reconectada automaticamente");
        },
        () => {
          toast.error("Impressora desconectou. Verifique se está ligada e tente parear novamente.");
        }
      );
    };
    disconnectHandlerRef.current = handler;
    device.addEventListener("gattserverdisconnected", handler);
  };

  const [btPairing, setBtPairing] = useState(false);

  const handlePairBluetooth = async () => {
    const btStatus = getBluetoothStatus();
    if (!btStatus.supported) {
      const { title, description } = getBtUnsupportedMessage(btStatus.reason);
      toast.error(title, { description, duration: 8000 });
      return;
    }
    setBtPairing(true);
    try {
      const device = await Promise.race([
        requestBluetoothPrinter(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
      ]);
      if (device) {
        setBtDevice(device);
        // Web: connect GATT manually
        toast.info("Conectando à impressora...");
        const char = await connectToDevice(device);
        if (char) {
          setBtConnected(true);
          setBtReconnectFailed(false);
          toast.success(`Impressora "${device.name || "Bluetooth"}" conectada!`);
        } else {
          setBtConnected(false);
          toast.warning(`Impressora pareada mas não conectou. Ela conectará automaticamente ao imprimir.`);
        }
        attachDisconnectHandler(device);
      }
    } catch (err: any) {
      console.error("[BT] Pair error:", err);
      const msg = err?.message || "";
      if (msg.includes("globally disabled") || msg.includes("Web Bluetooth")) {
        toast.error(`Web Bluetooth está bloqueado neste contexto. Abra ${getPublicHost()} diretamente no Google Chrome.`);
      } else if (msg.includes("denied") || msg.includes("permission")) {
        toast.error("Permissão negada", {
          description: "Vá em Configurações > Apps > TrendFood > Permissões e ative Bluetooth e Localização.",
          duration: 8000,
        });
      } else if (msg.includes("disabled") || msg.includes("location")) {
        toast.error("Ative o GPS", {
          description: "O Bluetooth precisa da Localização ativada para encontrar impressoras.",
          duration: 8000,
        });
      } else {
      toast.error("Erro ao buscar impressora", {
          description: "Verifique se Bluetooth e GPS estão ligados.",
          duration: 8000,
        });
      }
    } finally {
      setBtPairing(false);
    }
  };

  const handleDisconnectBluetooth = () => {
    if (btDevice) {
      disconnectPrinter(btDevice);
      setBtDevice(null);
      setBtConnected(false);
      toast.info("Impressora desconectada.");
    }
  };

  // Auto-reconnect to previously paired Bluetooth printer on mount/reload
  const btReconnectAttempted = useRef(false);
  useEffect(() => {
    if (loading || !user || !isReady) return; // guard: wait for auth + isReady
    if (btDevice) return; // already connected
    let supported = false;
    try { supported = isBluetoothSupported(); } catch { /* */ }
    if (!supported) return;
    if (btReconnectAttempted.current) return;
    btReconnectAttempted.current = true;

    const onConnected = (device: any) => {
      setBtDevice(device);
      setBtConnected(true);
      setBtReconnectFailed(false);
      toast.success("Impressora reconectada automaticamente");
      attachDisconnectHandler(device);
    };

    reconnectStoredPrinter()
      .then(async (device) => {
        if (device) {
          onConnected(device);
          return;
        }
        // Fallback: retry with backoff if immediate reconnect failed
        const storedId = getStoredDeviceId();
        if (!storedId) return;
        try {
          const bt = navigator as any;
          if (typeof bt.bluetooth?.getDevices !== "function") return;
          const devices: any[] = await bt.bluetooth.getDevices();
          const target = devices.find((d: any) => d.id === storedId);
          if (!target) return;
          console.log("[BT] Starting backoff retry...");
          autoReconnect(target, onConnected, () => {
            console.log("[BT] All backoff retries exhausted");
            setBtReconnectFailed(true);
          }, 5);
        } catch (err) {
          console.warn("[BT] Backoff fallback error:", err);
          setBtReconnectFailed(true);
        }
      })
      .catch((err) => {
        console.warn("[BT] Auto-reconnect failed on mount:", err);
        if (getStoredDeviceId()) setBtReconnectFailed(true);
      });
  }, [loading, user, isReady]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && !organization && !retryRef.current) {
      retryRef.current = true;
      refreshOrganizationForUser(user.id);
    }
  }, [loading, user, organization, refreshOrganizationForUser]);

  // Listen to popstate (browser back/forward) to update active tab
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let tabFromUrl = params.get("tab") as TabKey | null;
    if (tabFromUrl === "kitchen" || tabFromUrl === "waiter") tabFromUrl = "operations";
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  // Post-checkout feedback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura ativada com sucesso! Bem-vindo ao plano Pro 🎉");
      refreshOrganization();
      navigate("/dashboard", { replace: true });
    }
  }, [location.search, navigate, refreshOrganization]);

  const subscriptionStatus = (organization as { subscription_status?: string })?.subscription_status ?? "active";

  const lockedFeatures = useMemo(() => ({
    coupons: !planLimits.canAccess("cupons"),
    bestsellers: !planLimits.canAccess("bestsellers"),
    kitchen: !planLimits.canAccess("kds"),
    waiter: !planLimits.canAccess("waiter"),
    caixa: !planLimits.canAccess("caixa"),
    reports: !planLimits.canAccess("reports"),
    stock: !planLimits.canAccess("stock_ingredients"),
    pricing: !planLimits.canAccess("pricing"),
    ifood: !planLimits.canAccess("ifood"),
    aibot: !planLimits.canAccess("ai_bot"),
    campaigns: !planLimits.canAccess("campaigns"),
    intelligence: !planLimits.canAccess("intelligence_panel"),
  }), [planLimits.effectivePlan]);

  const sidebarGroups = useMemo(() => [
    {
      id: "premium", emoji: "👑", title: "PREMIUM",
      items: [
        { key: "intelligence" as TabKey, icon: <span className="text-sm">👑</span>, label: "Inteligência (BI)", locked: lockedFeatures.intelligence },
      ],
    },
    {
      id: "operacional", emoji: "⚡", title: "OPERACIONAL",
      items: [
        { key: "counter" as TabKey, icon: <ShoppingCart className="w-4 h-4" />, label: "Balcão" },
        { key: "tables" as TabKey, icon: <TableProperties className="w-4 h-4" />, label: "Mesas & Comandas" },
        { key: "operations" as TabKey, icon: <Flame className="w-4 h-4" />, label: "Cozinha & Pedidos", locked: lockedFeatures.kitchen || lockedFeatures.waiter },
        { key: "courier" as TabKey, icon: <Bike className="w-4 h-4" />, label: "Motoboys" },
        { key: "history" as TabKey, icon: <History className="w-4 h-4" />, label: "Histórico" },
        { key: "reviews" as TabKey, icon: <Star className="w-4 h-4" />, label: "Avaliações" },
        { key: "loyalty" as TabKey, icon: <Gift className="w-4 h-4" />, label: "Fidelidade" },
      ],
    },
    {
      id: "logistica", emoji: "📦", title: "LOGÍSTICA",
      items: [
        { key: "menu" as TabKey, icon: <UtensilsCrossed className="w-4 h-4" />, label: "Cardápio (Menu)" },
        { key: "stock" as TabKey, icon: <Package className="w-4 h-4" />, label: "Estoque & Insumos", locked: lockedFeatures.stock },
      ],
    },
    {
      id: "financeiro", emoji: "💰", title: "FINANCEIRO",
      items: [
        { key: "caixa" as TabKey, icon: <Wallet className="w-4 h-4" />, label: "Fluxo de Caixa", locked: lockedFeatures.caixa },
        { key: "pricing" as TabKey, icon: <Calculator className="w-4 h-4" />, label: "Precificação", locked: lockedFeatures.pricing },
        { key: "reports" as TabKey, icon: <FileBarChart className="w-4 h-4" />, label: "Relatórios", locked: lockedFeatures.reports },
        { key: "coupons" as TabKey, icon: <Tag className="w-4 h-4" />, label: "Cupons", locked: lockedFeatures.coupons },
        { key: "bestsellers" as TabKey, icon: <BarChart2 className="w-4 h-4" />, label: "Mais Vendidos", locked: lockedFeatures.bestsellers },
        ...(featureFlags?.fiscal_enabled || isAdmin
          ? [{ key: "fiscal" as TabKey, icon: <FileBarChart className="w-4 h-4" />, label: "Fiscal (NFC-e)" }]
          : []),
      ],
    },
    {
      id: "integracoes", emoji: "🔗", title: "INTEGRAÇÕES",
      items: [
        { key: "ifood" as TabKey, icon: <span className="text-sm">🛵</span>, label: "iFood", locked: lockedFeatures.ifood },
        { key: "telegram" as TabKey, icon: <Send className="w-4 h-4" />, label: "Telegram" },
        { key: "aibot" as TabKey, icon: <span className="text-sm">🤖</span>, label: "Robô IA", locked: lockedFeatures.aibot },
        { key: "campaigns" as TabKey, icon: <span className="text-sm">📣</span>, label: "Campanhas WhatsApp", locked: lockedFeatures.campaigns },
      ],
    },
    {
      id: "ajustes", emoji: "⚙️", title: "AJUSTES",
      items: [
        { key: "guide" as TabKey, icon: <BookOpen className="w-4 h-4" />, label: "Como Usar" },
        { key: "profile" as TabKey, icon: <Store className="w-4 h-4" />, label: "Dados da Loja" },
        { key: "subscription" as TabKey, icon: <Rocket className="w-4 h-4" />, label: "Assinatura / Plano" },
        { key: "printer" as TabKey, icon: <Printer className="w-4 h-4" />, label: "Impressora Térmica" },
        { key: "features" as TabKey, icon: <Sparkles className="w-4 h-4" />, label: "Funcionalidades" },
        { key: "settings" as TabKey, icon: <Settings className="w-4 h-4" />, label: "Configurações" },
      ],
    },
  ], [lockedFeatures]);


  // Show tour after onboarding is done but tour hasn't been completed
  useEffect(() => {
    if (organization && (organization as any).onboarding_done && !(organization as any).dashboard_tour_done) {
      const t = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(t);
    }
  }, [organization]);

  if (loading || !user) {
    return (
      <div className="dashboard-cc min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-3 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="dashboard-cc min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🏪</p>
          <h1 className="font-bold text-xl mb-2">Nenhuma loja vinculada</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {isAdmin
              ? "Você está logado como administrador da plataforma."
              : "Sua conta ainda não tem uma loja configurada."}
          </p>
          <div className="flex gap-2 justify-center">
            {isAdmin && (
              <Button asChild>
                <Link to="/admin">Acessar Painel Admin</Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  if (subscriptionStatus === "inactive") {
    return (
      <div className="dashboard-cc min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="font-bold text-foreground text-xl mb-2">Sua assinatura está inativa</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Para continuar usando o painel, ative seu plano. Entre em contato conosco.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={`https://wa.me/${organization?.whatsapp || "5516988083263"}?text=Quero+reativar+minha+assinatura+TrendFood`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: "#25D366" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.940 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar no WhatsApp
            </a>
            <Button onClick={signOut} variant="outline">Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  // Sync tabs with URL
  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    setSidebarSearch("");
    navigate(`/dashboard?tab=${key}`, { replace: false });
  };

  const toggleAutoPrint = (val: boolean) => {
    setAutoPrint(val);
    localStorage.setItem(AUTO_PRINT_KEY, String(val));
  };
  const toggleNotifications = (val: boolean) => {
    setNotificationsEnabled(val);
    localStorage.setItem(NOTIF_KEY_DASH, String(val));
  };


  const handleManualReconnect = async () => {
    toast.info("Reconectando impressora...");
    try {
      const device = await reconnectStoredPrinter();
      if (device) {
        setBtDevice(device);
        setBtConnected(true);
        setBtReconnectFailed(false);
        attachDisconnectHandler(device);
        toast.success(`Impressora "${device.name || "Bluetooth"}" reconectada!`);
        return;
      }
    } catch {
      // fall through to new pairing
    }
    // Fallback: open pairing dialog (user gesture present)
    toast.info("Reconexão falhou. Abrindo pareamento...");
    await handlePairBluetooth();
    setBtReconnectFailed(false);
  };

  // Sidebar nav button style helper
  const navBtnClass = (key: TabKey) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left border-l-2 ${
      activeTab === key
        ? "bg-primary/12 text-primary font-semibold border-primary [&_svg]:text-primary"
        : "border-transparent text-white/70 hover:bg-white/[0.04] hover:text-white [&_svg]:text-white/50 hover:[&_svg]:text-white"
    }`;

  const showOnboarding = organization && !(organization as any).onboarding_done;

  return (
    <div className="dashboard-cc min-h-screen bg-background flex w-full">
      {showOnboarding && (
        <OnboardingWizard
          organization={organization}
          onComplete={async () => { await refreshOrganization(); }}
        />
      )}
      {showTour && (
        <DashboardTour
          orgId={organization.id}
          onComplete={() => {
            setShowTour(false);
            refreshOrganization();
          }}
        />
      )}
      {user && (
        <>
          <CreateUnitDialog
            open={createUnitOpen}
            onOpenChange={setCreateUnitOpen}
            userId={user.id}
            parentPlan={organization?.subscription_plan ?? "free"}
            onCreated={async () => {
              await refreshOrganization();
            }}
          />
          {deleteUnit && (
            <DeleteUnitDialog
              open={!!deleteUnit}
              onOpenChange={(open) => { if (!open) setDeleteUnit(null); }}
              orgId={deleteUnit.id}
              orgName={deleteUnit.name}
              onDeleted={async () => {
                setDeleteUnit(null);
                await refreshOrganization();
              }}
            />
          )}
        </>
      )}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 transform transition-transform duration-300 backdrop-blur-xl border-r border-white/5
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto
        `}
        style={{
          background:
            "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.12) 0%, transparent 45%), hsl(220 15% 6%)",
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <span className="block w-6 h-px bg-primary" aria-hidden="true" />
            <span className="font-mono text-[10px] font-semibold tracking-[0.22em] text-primary/80">PAINEL</span>
          </div>
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/pwa-192.png" alt="TrendFood" className="w-8 h-8 rounded-xl object-contain shadow-lg shadow-primary/30" />
            <span className="font-black text-white text-base tracking-tight">TrendFood</span>
          </Link>
        </div>

        {/* Org switcher */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-1">
            <OrgSwitcher
            organizations={organizations}
            activeOrg={organization}
            onSwitch={(orgId) => {
              switchOrganization(orgId);
              handleTabChange("home");
            }}
            onCreateNew={() => setCreateUnitOpen(true)}
            canCreateNew={planLimits.canAccess("multi_unit")}
            onDelete={(orgId) => {
              const org = organizations.find((o) => o.id === orgId);
              if (org) setDeleteUnit({ id: org.id, name: org.name });
            }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar aba…"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.03] text-sm text-white placeholder:font-mono placeholder:text-xs placeholder:text-white/40 border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Premium group – rendered above Home to grab attention */}
          {(() => {
            const premium = sidebarGroups.find((g) => g.id === "premium");
            if (!premium) return null;
            const q = sidebarSearch.toLowerCase();
            const filteredItems = q
              ? premium.items.filter((item) => item.label.toLowerCase().includes(q))
              : premium.items;
            if (filteredItems.length === 0) return null;
            return (
              <div className="mb-3 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent p-2">
                <div className="flex items-center gap-2 px-2 py-1 cursor-default select-none">
                  <span className="text-[11px] leading-none">👑</span>
                  <span className="text-[10px] font-mono tracking-widest text-amber-400/90">PREMIUM</span>
                </div>
                {filteredItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
                    className={navBtnClass(item.key)}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.locked && <Lock className="w-3.5 h-3.5 text-amber-400/70" />}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Home – fixed at top */}
          {(!sidebarSearch || "home".includes(sidebarSearch.toLowerCase())) && (
            <button
              data-tour="home"
              onClick={() => { handleTabChange("home"); setSidebarOpen(false); }}
              className={navBtnClass("home")}
            >
              <Home className="w-4 h-4" />
              <span className="flex-1 text-left">Home</span>
            </button>
          )}

          {/* Always-visible groups (filtered) */}
          {sidebarGroups.map((group) => {
            if (group.id === "premium") return null;
            const q = sidebarSearch.toLowerCase();
            const filteredItems = q
              ? group.items.filter((item) => item.label.toLowerCase().includes(q))
              : group.items;
            if (filteredItems.length === 0) return null;
            return (
              <div key={group.id} className="mt-5 pt-3 border-t border-white/[0.06] first:border-t-0 first:pt-0 first:mt-3">
                <div className="flex items-center gap-2 px-3 py-2 cursor-default select-none">
                  <span className="block w-6 h-px bg-primary" aria-hidden="true" />
                  <span className="text-[11px] leading-none opacity-80">{group.emoji}</span>
                  <span className="font-mono text-[11px] font-semibold tracking-[0.18em] text-primary">{group.title}</span>
                </div>
                <div className="space-y-0.5">
                  {filteredItems.map((item) => (
                    <button
                      key={item.key}
                      data-tour={item.key}
                      onClick={() => { handleTabChange(item.key); setSidebarOpen(false); }}
                      className={navBtnClass(item.key)}
                    >
                      {item.icon}
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.locked && <Lock className="w-3.5 h-3.5 text-amber-400/70" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pb-5 pt-3 border-t border-white/[0.06] space-y-1">
          <button
            onClick={() => handleTabChange("referral")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all duration-150"
          >
            <Gift className="w-4 h-4" />
            Ganhe Desconto
          </button>
          <div className="pt-1 mt-1 border-t border-white/[0.06] space-y-0.5">
          <a
            href={communityWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-white transition-all duration-150"
          >
            <MessageCircle className="w-4 h-4 text-white/50" />
            Comunidade WhatsApp
          </a>
          <a
            href={`${getPublicBaseUrl()}/unidade/${organization.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-white transition-all duration-150"
          >
            <ExternalLink className="w-4 h-4 text-white/50" />
            Ver página pública
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-white/50 hover:text-white hover:bg-white/[0.04]" />
            <button
              onClick={handleSignOut}
              className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/[0.04] hover:text-red-400 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 text-white/50" />
              Sair
            </button>
          </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-card/80 backdrop-blur-lg border-b border-border px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {(organization as any).logo_url ? (
              <img src={(organization as any).logo_url} alt={organization.name} className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <span className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">{organization.name.charAt(0).toUpperCase()}</span>
            )}
            <span className="font-bold text-sm">{organization.name}</span>
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 p-4 max-[380px]:p-3 md:p-6 overflow-y-auto pb-32 lg:pb-12">
          {/* Trial banners */}
          {planLimits.trialActive && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Você tem <strong>{planLimits.trialDaysLeft} {planLimits.trialDaysLeft === 1 ? "dia" : "dias"}</strong> restantes do plano Pro grátis!
                </p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-3.5 h-3.5" />Assinar Pro
              </Button>
            </div>
          )}
          {planLimits.trialExpired && planLimits.plan === "free" && planLimits.promoEligible && (
            <div className="mb-4 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/10 border border-primary/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    🔥 Oferta exclusiva: <span className="text-primary">50% OFF no primeiro mês!</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Assine agora pela metade do preço. Depois, valor normal. Sem fidelidade.
                  </p>
                </div>
              </div>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-3.5 h-3.5" />Aproveitar oferta
              </Button>
            </div>
          )}
          {planLimits.trialExpired && planLimits.plan === "free" && !planLimits.promoEligible && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Seu período de teste Pro expirou. Faça upgrade para continuar usando todos os recursos.
                </p>
              </div>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-3.5 h-3.5" />Fazer upgrade
              </Button>
            </div>
          )}

          {/* Assinatura paga expirando */}
          {!planLimits.subscriptionExpired && planLimits.subscriptionDaysLeft > 0 && planLimits.subscriptionDaysLeft <= 7 && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Sua assinatura expira em <strong>{planLimits.subscriptionDaysLeft} {planLimits.subscriptionDaysLeft === 1 ? "dia" : "dias"}</strong>. Renove para não perder acesso.
                </p>
              </div>
              <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-3.5 h-3.5" />Renovar
              </Button>
            </div>
          )}

          {/* Assinatura paga expirada */}
          {planLimits.subscriptionExpired && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  Sua assinatura expirou. Renove para continuar usando todos os recursos.
                </p>
              </div>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setUpgradeOpen(true)}>
                <Zap className="w-3.5 h-3.5" />Renovar agora
              </Button>
            </div>
          )}

          {btReconnectFailed && !btConnected && getStoredDeviceId() && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800 mb-4">
              <Printer className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
              <p className="text-sm text-orange-800 dark:text-orange-300 flex-1">
                Impressora não reconectou automaticamente.
              </p>
              <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-orange-400 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/40" onClick={handleManualReconnect}>
                <Printer className="w-3.5 h-3.5" />
                Reconectar
              </Button>
            </div>
          )}

          <ErrorBoundary>
          <Suspense key={activeTab} fallback={
            <div className="space-y-3 py-4" aria-busy="true" aria-live="polite">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          }>
          <div key={activeTab} className="animate-page-fade">
          {activeTab === "home" && <HomeTab organization={organization} onNavigate={handleTabChange} />}
          {activeTab === "menu" && <MenuTab organization={organization} menuItemLimit={planLimits.menuItemLimit} canAccessAddons={planLimits.canAccess("addons")} canAccessStockIngredients={planLimits.canAccess("stock_ingredients")} />}
          {activeTab === "tables" && <TablesTab organization={organization} tableLimit={planLimits.tableLimit} />}
          {activeTab === "history" && <HistoryTab orgId={organization.id} restrictTo7Days={!planLimits.canAccess("history_full")} />}
          {activeTab === "coupons" && (lockedFeatures.coupons
            ? <UpgradePrompt title="Cupons de Desconto" description="Crie e gerencie cupons de desconto para seus clientes. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <CouponsTab orgId={organization.id} organization={organization} onNavigate={handleTabChange} />)}
          {activeTab === "bestsellers" && (lockedFeatures.bestsellers
            ? <UpgradePrompt title="Mais Vendidos" description="Veja os itens mais vendidos do seu cardápio. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <BestSellersTab orgId={organization.id} />)}
          {activeTab === "operations" && ((lockedFeatures.kitchen || lockedFeatures.waiter)
            ? <UpgradePrompt title="Cozinha & Gestão de Pedidos" description="Gerencie pedidos em tempo real com o KDS e controle entregas. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <OperationsTab
                orgId={organization.id}
                orgName={organization.name}
                orgSlug={organization.slug}
                storeAddress={organization.store_address}
                courierConfig={(organization as any).courier_config}
                printMode={(organization as any).print_mode ?? 'browser'}
                printerWidth={(organization as any).printer_width ?? '58mm'}
                btDevice={btDevice}
                pixKey={(organization as any).pix_key}
                onPairBluetooth={handlePairBluetooth}
                btPairing={btPairing}
                btConnected={btConnected}
                btSupported={btSupported}
                autoPrint={autoPrint}
                onToggleAutoPrint={toggleAutoPrint}
                notificationsEnabled={notificationsEnabled}
                onToggleNotifications={toggleNotifications}
                whatsapp={organization.whatsapp}
                pixConfirmationMode={organization.pix_confirmation_mode as any}
                ifoodCourierCopy={!!(organization as any).ifood_courier_copy}
              />)}
          {activeTab === "caixa" && (lockedFeatures.caixa
            ? <UpgradePrompt title="Controle de Caixa" description="Gerencie abertura e fechamento de caixa. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <CaixaTab orgId={organization.id} />)}
          {activeTab === "features" && <FeaturesTab effectivePlan={planLimits.effectivePlan} />}
          {activeTab === "reports" && (lockedFeatures.reports
            ? <UpgradePrompt title="Relatórios Avançados" description="Gráficos de faturamento, ticket médio, horários de pico e comparativos. Disponível nos planos Enterprise e Vitalício." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <ReportsTab orgId={organization.id} orgName={organization.name} orgLogo={organization.logo_url} orgWhatsapp={organization.whatsapp} orgAddress={organization.store_address} orgCnpj={(organization as any).cnpj} />)}
          {activeTab === "guide" && <GuideTab />}
          {activeTab === "profile" && <StoreProfileTab organization={organization} effectivePlan={planLimits.effectivePlan} />}
          {activeTab === "printer" && <PrinterTab btDevice={btDevice} btConnected={btConnected} onPairBluetooth={handlePairBluetooth} onDisconnectBluetooth={handleDisconnectBluetooth} btSupported={btSupported} btPairing={btPairing} />}
          {activeTab === "settings" && <SettingsTab />}
          {activeTab === "courier" && <CourierDashboardTab orgId={organization.id} orgSlug={organization.slug} orgName={organization.name} orgLogo={(organization as any).logo_url} orgWhatsapp={(organization as any).whatsapp} orgAddress={(organization as any).store_address} courierConfig={(organization as any).courier_config} />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "stock" && (lockedFeatures.stock
            ? <UpgradePrompt title="Estoque & Insumos" description="Controle o estoque de ingredientes e composição dos produtos. Disponível no plano Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <StockTab orgId={organization.id} />)}
          {activeTab === "pricing" && (lockedFeatures.pricing
            ? <UpgradePrompt title="Precificação" description="Calcule custos, margens e preços sugeridos com base na ficha técnica dos seus produtos. Disponível no plano Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <PricingTab orgId={organization.id} />)}
          {activeTab === "referral" && <ReferralSection orgId={organization.id} subscriptionPlan={organization.subscription_plan} />}
          {activeTab === "reviews" && <ReviewsTab orgId={organization.id} />}
          {activeTab === "loyalty" && <LoyaltyTab orgId={organization.id} organization={organization} onNavigate={handleTabChange} />}
          {activeTab === "ifood" && (
            !featureFlags?.ifood_enabled && !isAdmin && !ifoodBetaUser
              ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span>🛵</span> Integração iFood
                      <Badge className="bg-orange-500 text-white">EM BREVE</Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">Receba pedidos do iFood automaticamente na sua produção.</p>
                  </div>
                  <Card className="border-orange-500/30">
                    <CardContent className="py-12 text-center space-y-4">
                      <div className="text-6xl">🛵</div>
                      <h3 className="text-lg font-bold">Em breve</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Estamos finalizando a homologação oficial com o iFood. Em breve você poderá receber pedidos automaticamente aqui no TrendFood, sem mexer em mais nada.
                      </p>
                      <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400">
                        Liberação em rollout controlado
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              )
              : lockedFeatures.ifood
                ? <UpgradePrompt title="Integração iFood" description="Receba e gerencie pedidos do iFood direto no painel. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
                : <IFoodTab orgId={organization.id} />
          )}
          {activeTab === "telegram" && <TelegramTab orgId={organization.id} />}
          {activeTab === "aibot" && (() => {
            const isLifetime = (organization as any).subscription_plan === "lifetime";
            const requiresAddon = !!(organization as any).requires_ai_bot_addon;
            // Lifetime sempre vê o painel do Robô (o AiBotAddonCard cuida do add-on por dentro).
            // Para orgs que exigem add-on, aguarda o carregamento antes de decidir bloquear.
            if (isLifetime) return <AIBotTab orgId={organization.id} />;
            if (requiresAddon && aiBotAddonLoading) {
              return (
                <div className="flex items-center justify-center py-20">
                  <Skeleton className="h-8 w-40" />
                </div>
              );
            }
            return lockedFeatures.aibot
              ? <UpgradePrompt title="Robô IA de Vendas" description="Atendimento automático no WhatsApp com IA, fechando vendas 24/7. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
              : <AIBotTab orgId={organization.id} />;
          })()}
          {activeTab === "counter" && <CounterTab orgId={organization.id} pausedCategories={(organization as any).paused_categories ?? []} />}
          {activeTab === "campaigns" && (lockedFeatures.campaigns
            ? <UpgradePrompt title="Campanhas WhatsApp" description="Recupere clientes inativos no automático via WhatsApp com anti-ban incluso. Disponível nos planos Pro e Enterprise." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <CampaignsTab orgId={organization.id} />
          )}
          {activeTab === "intelligence" && (lockedFeatures.intelligence
            ? <UpgradePrompt title="Inteligência do Negócio (BI)" description="Descubra qual produto realmente te dá lucro, quando sua loja bomba, sua projeção da semana e alertas automáticos. Exclusivo dos planos Enterprise e Vitalício." orgId={organization.id} currentPlan={organization.subscription_plan} promoEligible={planLimits.promoEligible} />
            : <IntelligenceTab orgId={organization.id} onNavigate={(tab) => setActiveTab(tab as TabKey)} />
          )}
          {activeTab === "fiscal" && (
            !featureFlags?.fiscal_enabled && !isAdmin
              ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span>🧾</span> Fiscal (NFC-e)
                      <Badge className="bg-orange-500 text-white">EM BREVE</Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">Emissão de NFC-e integrada ao TrendFood.</p>
                  </div>
                  <Card className="border-orange-500/30">
                    <CardContent className="py-12 text-center space-y-4">
                      <div className="text-6xl">🧾</div>
                      <h3 className="text-lg font-bold">Em manutenção</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                        Estamos finalizando a homologação da emissão fiscal (NFC-e). Assim que estiver liberado, você poderá emitir direto do painel — sem configurar nada extra.
                      </p>
                      <Badge variant="outline" className="border-orange-500/40 text-orange-600 dark:text-orange-400">
                        Liberação em rollout controlado
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              )
              : <FiscalTab orgId={organization.id} organization={organization} effectivePlan={planLimits.effectivePlan} promoEligible={planLimits.promoEligible} />
          )}
          </div>
          </Suspense>
          </ErrorBoundary>

          {/* ── Rodapé institucional ─────────────────────────── */}
          <footer className="mt-8 border-t border-border pt-4 pb-6 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              TrendFood © {new Date().getFullYear()} — CNPJ 66.067.207/0001-91
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1 max-w-md mx-auto leading-relaxed">
              O TrendFood é uma ferramenta de gestão. A emissão de documentos fiscais e o cumprimento de obrigações tributárias são de responsabilidade exclusiva do lojista.
            </p>
          </footer>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border flex items-center justify-around px-1 py-2 safe-area-pb">
          {[
            { key: "home" as TabKey, icon: <Home className="w-5 h-5" />, label: "Home" },
            { key: "operations" as TabKey, icon: <Flame className="w-5 h-5" />, label: "Pedidos" },
            { key: "menu" as TabKey, icon: <UtensilsCrossed className="w-5 h-5" />, label: "Cardápio" },
            { key: "tables" as TabKey, icon: <TableProperties className="w-5 h-5" />, label: "Mesas" },
            { key: "counter" as TabKey, icon: <ShoppingCart className="w-5 h-5" />, label: "Balcão" },
            { key: "history" as TabKey, icon: <History className="w-5 h-5" />, label: "Histórico" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => handleTabChange(item.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 transition-colors ${
                activeTab === item.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Fixed status bar */}
        <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur border-t border-border px-3 py-1 items-center gap-2 text-[11px] overflow-x-auto">
          <button
            onClick={() => toggleAutoPrint(!autoPrint)}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${autoPrint ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
            <Printer className="w-3 h-3 text-muted-foreground" />
            <span className={autoPrint ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {autoPrint ? "Imp. auto." : "Imp. off"}
            </span>
          </button>

          <span className="text-border flex-shrink-0">|</span>

          <button
            onClick={() => toggleNotifications(!notificationsEnabled)}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${notificationsEnabled ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
            <BellRing className="w-3 h-3 text-muted-foreground" />
            <span className={notificationsEnabled ? "text-green-600 font-medium" : "text-muted-foreground"}>
              {notificationsEnabled ? "Notif. on" : "Notif. off"}
            </span>
          </button>

          {printMode === "bluetooth" && (
            <>
              <span className="text-border flex-shrink-0">|</span>
              <div className="flex items-center gap-1 whitespace-nowrap">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${btConnected ? "bg-green-500" : "bg-destructive"}`} />
                <span className={btConnected ? "text-green-600 font-medium" : "text-destructive"}>
                  {btConnected ? `BT: ${btDevice?.name || "OK"}` : "BT: off"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      {organization && (
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          orgId={organization.id}
          currentPlan={planLimits.plan}
          promoEligible={planLimits.promoEligible}
          subscriptionExpired={planLimits.subscriptionExpired}
        />
      )}

    </div>
  );
};

export default DashboardPage;
