import { useDeliveredOrders, useDeliveredUnpaidOrders, useOrders } from "@/hooks/useOrders";
import { extractDeliveryFee } from "@/lib/formatReceiptText";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Bar as BarRaw,
  XAxis as XAxisRaw,
  YAxis as YAxisRaw,
  CartesianGrid,
  Tooltip as TooltipRaw,
  ResponsiveContainer,
  Line as LineRaw,
  ComposedChart,
  Legend as LegendRaw,
  BarChart,
} from "recharts";

// Cast recharts class components to `any` so React 18's stricter JSX typing
// accepts them (recharts 2.x doesn't expose a `props` field on its classes).
const XAxis = XAxisRaw as any;
const YAxis = YAxisRaw as any;
const Tooltip = TooltipRaw as any;
const Bar = BarRaw as any;
const Line = LineRaw as any;
const Legend = LegendRaw as any;
import { DollarSign, ShoppingBag, Clock, TrendingUp, TrendingDown, Minus, PauseCircle, PlayCircle, Loader2, ClipboardList, LayoutGrid, AlertTriangle, Wallet, Bell, BellOff, Download, Smartphone, ChevronRight, Flame, UtensilsCrossed, ShoppingCart, TableProperties, FileBarChart, Activity, Radio } from "lucide-react";
import { subDays, subMonths, format, isSameDay, startOfDay, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import SetupChecklist from "@/components/dashboard/SetupChecklist";
import BannerRecoveryBanner from "@/components/dashboard/BannerRecoveryBanner";
import PushActivationBanner from "@/components/dashboard/PushActivationBanner";
import UpdateBanner from "@/components/dashboard/UpdateBanner";
import CampaignsAnnouncementBanner from "@/components/dashboard/CampaignsAnnouncementBanner";
import ReferralHomeCard from "@/components/dashboard/ReferralHomeCard";

interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  subscription_status?: string;
  paused?: boolean;
  whatsapp?: string | null;
  store_address?: string | null;
  business_hours?: any;
  force_open?: boolean;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HomeTab({ organization, onNavigate }: { organization: Organization; onNavigate?: (tab: string) => void }) {
  const { data: delivered = [], isLoading: loadingDelivered } = useDeliveredOrders(organization.id);
  const { data: unpaid = [], isLoading: loadingUnpaid } = useDeliveredUnpaidOrders(organization.id);
  const { data: activeOrders = [] } = useOrders(organization.id, ["pending", "preparing"]);
  const planLimits = usePlanLimits(organization as any);
  const { refreshOrganization } = useAuth();
  const [pauseLoading, setPauseLoading] = useState(false);
  const navigate = useNavigate();
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);
  }, []);
  const { isSubscribed, isLoading: pushLoading, isSupported: pushSupported, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushSubscription(organization.id);

  const occupiedTables = new Set(activeOrders.filter(o => o.table_number > 0).map(o => o.table_number)).size;

  const { data: lowStockCount = 0 } = useQuery({
    queryKey: ["low_stock_count", organization.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items")
        .select("quantity, min_quantity")
        .eq("organization_id", organization.id)
        .gt("min_quantity", 0);
      if (error) throw error;
      return (data ?? []).filter(i => i.quantity <= i.min_quantity).length;
    },
    enabled: !!organization.id,
  });

  const togglePause = async () => {
    setPauseLoading(true);
    const newVal = !organization.paused;
    const { error } = await supabase
      .from("organizations")
      .update({ paused: newVal } as any)
      .eq("id", organization.id);
    if (error) {
      toast.error("Erro ao atualizar status da loja");
    } else {
      toast.success(newVal ? "Loja pausada! Clientes não podem fazer pedidos." : "Loja reativada! Pedidos liberados.");
      await refreshOrganization();
    }
    setPauseLoading(false);
  };

  const isLoading = loadingDelivered || loadingUnpaid;

  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const todayDelivered = delivered.filter((o) => isSameDay(new Date(o.created_at), today));
  const yesterdayDelivered = delivered.filter((o) => isSameDay(new Date(o.created_at), yesterday));

  const orderTotal = (o: any) =>
    (o.order_items ?? []).reduce((s: number, i: any) => s + i.price * i.quantity, 0) + extractDeliveryFee(o.notes);

  const totalRevenue = delivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + orderTotal(o), 0);

  const todayRevenue = todayDelivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + orderTotal(o), 0);

  const yesterdayRevenue = yesterdayDelivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + orderTotal(o), 0);

  const pendingPayment = unpaid.length;

  const avgTicket =
    delivered.filter((o) => o.paid).length > 0
      ? totalRevenue / delivered.filter((o) => o.paid).length
      : 0;

  const revenueDelta =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null;

  const classifyPayment = (method: string | null | undefined): "Dinheiro" | "PIX" | "Cartão" => {
    const m = (method ?? "").toLowerCase().trim();
    if (m === "pix") return "PIX";
    if (["cartao", "credito", "debito", "credit_card"].includes(m)) return "Cartão";
    return "Dinheiro";
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayOrders = delivered.filter((o) => isSameDay(new Date(o.created_at), day));
    const revenue = dayOrders
      .filter((o) => o.paid)
      .reduce((acc, o) => acc + orderTotal(o), 0);
    return {
      dia: format(day, "EEE", { locale: ptBR }),
      pedidos: dayOrders.length,
      faturamento: Math.round(revenue * 100) / 100,
    };
  });

  const paymentChartData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayPaid = delivered.filter((o) => o.paid && isSameDay(new Date(o.created_at), day));
    const breakdown = { Dinheiro: 0, PIX: 0, Cartão: 0 };
    dayPaid.forEach((o) => {
      const cat = classifyPayment(o.payment_method);
      const val = orderTotal(o);
      breakdown[cat] += val;
    });
    return {
      dia: format(day, "EEE", { locale: ptBR }),
      Dinheiro: Math.round(breakdown.Dinheiro * 100) / 100,
      PIX: Math.round(breakdown.PIX * 100) / 100,
      Cartão: Math.round(breakdown.Cartão * 100) / 100,
    };
  });
  const paymentTotal = paymentChartData.reduce((s, d) => s + d.Dinheiro + d.PIX + d.Cartão, 0);

  const totalLast7Orders = last7.reduce((s, d) => s + d.pedidos, 0);

  const stats = [
    {
      label: "Faturamento total",
      value: fmtBRL(totalRevenue),
      icon: <DollarSign className="w-5 h-5" />,
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Pedidos entregues hoje",
      value: todayDelivered.length,
      icon: <ShoppingBag className="w-5 h-5" />,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      label: "Aguardando pagamento",
      value: pendingPayment,
      icon: <Clock className="w-5 h-5" />,
      gradient: "from-amber-500 to-amber-600",
    },
    {
      label: "Ticket médio",
      value: fmtBRL(avgTicket),
      icon: <TrendingUp className="w-5 h-5" />,
      gradient: "from-violet-500 to-violet-600",
    },
  ];

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-64 rounded-xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  // Cálculos para o cockpit
  const monthStart = startOfMonth(new Date());
  const monthRevenue = delivered
    .filter((o) => o.paid && new Date(o.created_at) >= monthStart)
    .reduce((acc, o) => acc + orderTotal(o), 0);
  const billingLimit = (organization as any).billing_alert_limit as number | undefined;
  const taxRegime = (organization as any).tax_regime as string | null;
  const annualLimits: Record<string, { limit: number; label: string }> = {
    mei: { limit: 81000, label: "MEI" },
    cpf: { limit: 27110.4, label: "CPF" },
    me: { limit: 360000, label: "ME" },
  };
  const taxCfg = taxRegime ? annualLimits[taxRegime] : null;
  const twelveMonthsAgo = subMonths(new Date(), 12);
  const yearRevenue = taxCfg
    ? delivered.filter((o) => o.paid && new Date(o.created_at) >= twelveMonthsAgo).reduce((acc, o) => acc + orderTotal(o), 0)
    : 0;
  const nowTime = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const quickActions = [
    { key: "operations", label: "Produção", desc: "Cozinha & Pedidos", icon: <Flame className="w-4 h-4" /> },
    { key: "counter", label: "Balcão", desc: "Venda rápida", icon: <ShoppingCart className="w-4 h-4" /> },
    { key: "tables", label: "Mesas", desc: "Comandas ativas", icon: <TableProperties className="w-4 h-4" /> },
    { key: "menu", label: "Catálogo", desc: "Cardápio", icon: <UtensilsCrossed className="w-4 h-4" /> },
    { key: "reports", label: "Relatórios", desc: "Análise financeira", icon: <FileBarChart className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5">
      <PushActivationBanner orgId={organization.id} />
      <UpdateBanner onNavigate={onNavigate} />
      {planLimits.canAccess("campaigns") && (
        <CampaignsAnnouncementBanner orgId={organization.id} onNavigate={onNavigate} />
      )}

      {/* ══ COMMAND HEADER ══════════════════════════════════════ */}
      <div className="cmd-panel p-5 md:p-6 animate-dashboard-fade-in">
        <span aria-hidden className="cmd-scanline" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="section-eyebrow mb-2">
              <Radio className="w-3 h-3" /> Central de Operação
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight tracking-tight truncate">
              {organization.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>{todayCapitalized}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="tabular-nums font-mono">{nowTime}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`status-pill ${organization.paused ? "status-pill--warn" : "status-pill--live"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${organization.paused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
              {organization.paused ? "Pausada" : "Operando"}
            </span>
            {organization.subscription_status === "active" && (
              <span className="status-pill status-pill--accent">
                <Activity className="w-3 h-3" /> Plano Ativo
              </span>
            )}
            {organization.subscription_status === "trial" && (
              <span className="status-pill status-pill--warn">Trial</span>
            )}
            {pushSupported && (
              <button
                onClick={async () => {
                  if (isSubscribed) { await pushUnsubscribe(); toast.success("Notificações desativadas"); }
                  else { const ok = await pushSubscribe(); ok ? toast.success("Notificações ativadas! 🔔") : toast("Permissão negada"); }
                }}
                disabled={pushLoading}
                className={`relative p-2 rounded-lg border transition-colors ${
                  isSubscribed
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-secondary text-muted-foreground border-border hover:bg-accent"
                }`}
                title={isSubscribed ? "Notificações ativas" : "Ativar notificações"}
              >
                {pushLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={togglePause}
              disabled={pauseLoading}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                organization.paused
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              {pauseLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : organization.paused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
              {organization.paused ? "Reativar loja" : "Pausar loja"}
            </button>
          </div>
        </div>

        {/* Quick action tiles */}
        {onNavigate && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-5 pt-5 border-t border-border">
            {quickActions.map((qa) => (
              <button key={qa.key} onClick={() => onNavigate(qa.key)} className="action-tile group">
                <div className="flex items-center justify-between">
                  <span className="action-tile__icon">{qa.icon}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">{qa.label}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">{qa.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Setup Checklist ─────────────────────────────── */}
      {onNavigate && (
        <SetupChecklist
          orgId={organization.id}
          orgWhatsapp={organization.whatsapp}
          orgAddress={organization.store_address}
          orgLogoUrl={organization.logo_url}
          orgBannerUrl={(organization as any)?.banner_url}
          orgPrintMode={(organization as any)?.print_mode}
          onNavigate={onNavigate}
        />
      )}

      {onNavigate && (
        <BannerRecoveryBanner
          orgId={organization.id}
          orgBannerUrl={(organization as any)?.banner_url}
          onNavigate={onNavigate}
        />
      )}

      {/* ══ HERO GRID ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue hero — spans 2 cols */}
        <div className="lg:col-span-2 cmd-panel cmd-panel--accent p-6 md:p-7 relative overflow-hidden animate-dashboard-slide-up">
          <span aria-hidden className="cmd-scanline" />
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, hsl(20 100% 55%) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <div className="section-eyebrow">
                <DollarSign className="w-3 h-3" /> Faturamento Hoje
              </div>
              {revenueDelta !== null && (
                <span className={`status-pill ${revenueDelta > 0 ? "status-pill--live" : revenueDelta < 0 ? "status-pill--danger" : "status-pill--info"}`}>
                  {revenueDelta > 0 ? <TrendingUp className="w-3 h-3" /> : revenueDelta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {revenueDelta > 0 ? "+" : ""}{revenueDelta}% vs ontem
                </span>
              )}
            </div>
            <p className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mt-3 tracking-tight tabular-nums text-foreground leading-none">
              {fmtBRL(todayRevenue)}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-primary" />
                {todayDelivered.filter((o) => o.paid).length} pagos hoje
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                {activeOrders.length} em andamento
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/60" />
                Mês: {fmtBRL(monthRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts column */}
        <div className="cmd-panel p-5 animate-dashboard-fade-in">
          <div className="section-eyebrow mb-3">
            <AlertTriangle className="w-3 h-3" /> Alertas
          </div>
          <div className="space-y-2">
            {activeOrders.length === 0 && lowStockCount === 0 && !planLimits.subscriptionExpired && organization.business_hours?.enabled && !organization.force_open ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                Tudo tranquilo por aqui.
              </div>
            ) : (
              <>
                {activeOrders.length > 0 && onNavigate && (
                  <button onClick={() => onNavigate("operations")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 transition-colors text-left">
                    <ClipboardList className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""} ativo{activeOrders.length !== 1 ? "s" : ""}</p>
                      <p className="text-[10px] text-muted-foreground">Ir para Produção</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {lowStockCount > 0 && onNavigate && (
                  <button onClick={() => onNavigate("stock")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/15 transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{lowStockCount} item{lowStockCount !== 1 ? "ns" : ""} c/ estoque baixo</p>
                      <p className="text-[10px] text-muted-foreground">Repor no Estoque</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {pendingPayment > 0 && (
                  <div className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{pendingPayment} aguardando pagamento</p>
                      <p className="text-[10px] text-muted-foreground">{fmtBRL(unpaid.reduce((s, o) => s + orderTotal(o), 0))}</p>
                    </div>
                  </div>
                )}
                {!organization.business_hours?.enabled && onNavigate && (
                  <button onClick={() => onNavigate("settings")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/15 transition-colors text-left">
                    <Clock className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Horário não configurado</p>
                      <p className="text-[10px] text-muted-foreground">Loja aparece sempre aberta</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {organization.force_open && onNavigate && (
                  <button onClick={() => onNavigate("settings")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">"Forçar abertura" ligado</p>
                      <p className="text-[10px] text-muted-foreground">Recebendo fora do horário</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {planLimits.subscriptionDaysLeft > 0 && planLimits.subscriptionDaysLeft <= 3 && onNavigate && (
                  <button onClick={() => onNavigate("subscription")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 hover:bg-red-500/15 transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Assina expira em {planLimits.subscriptionDaysLeft}d</p>
                      <p className="text-[10px] text-muted-foreground">Renovar agora</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {planLimits.subscriptionExpired && onNavigate && (
                  <button onClick={() => onNavigate("subscription")} className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 transition-colors text-left">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">Assinatura expirada</p>
                      <p className="text-[10px] text-muted-foreground">Renovar para reativar Pro</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══ METRIC TILES ════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-tile">
          <div className="flex items-center justify-between">
            <span className="metric-tile__label">Total</span>
            <DollarSign className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <p className="metric-tile__value text-foreground">{fmtBRL(totalRevenue)}</p>
          <p className="metric-tile__sub">Histórico completo</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center justify-between">
            <span className="metric-tile__label">Entregues hoje</span>
            <ShoppingBag className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <p className="metric-tile__value text-foreground">{todayDelivered.length}</p>
          <p className="metric-tile__sub">{todayDelivered.filter((o) => o.paid).length} pagos</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center justify-between">
            <span className="metric-tile__label">Ticket médio</span>
            <TrendingUp className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <p className="metric-tile__value text-foreground">{fmtBRL(avgTicket)}</p>
          <p className="metric-tile__sub">Por pedido pago</p>
        </div>
        <div className="metric-tile">
          <div className="flex items-center justify-between">
            <span className="metric-tile__label">Mesas ocupadas</span>
            <LayoutGrid className="w-3.5 h-3.5 text-primary/60" />
          </div>
          <p className="metric-tile__value text-foreground">{occupiedTables}</p>
          <p className="metric-tile__sub">Comandas ativas agora</p>
        </div>
      </div>

      {/* ══ FISCAL LIMITS ═══════════════════════════════════════ */}
      {(billingLimit && billingLimit > 0) || taxCfg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {billingLimit && billingLimit > 0 && (() => {
            const pct = Math.min(Math.round((monthRevenue / billingLimit) * 100), 100);
            const critical = pct >= 80;
            return (
              <div className={`cmd-panel p-4 ${critical ? "cmd-panel--danger" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="section-eyebrow"><Wallet className="w-3 h-3" /> Limite Mensal</span>
                  <span className={`status-pill ${critical ? "status-pill--danger" : pct >= 60 ? "status-pill--warn" : "status-pill--live"}`}>{pct}%</span>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {fmtBRL(monthRevenue)} <span className="text-muted-foreground font-normal text-xs">de {fmtBRL(billingLimit)}</span>
                </p>
                <Progress value={pct} className={`h-1.5 mt-2 ${critical ? "[&>div]:bg-red-500" : pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
              </div>
            );
          })()}
          {taxCfg && (() => {
            const pct = Math.min(Math.round((yearRevenue / taxCfg.limit) * 100), 100);
            const critical = pct >= 85;
            return (
              <div className={`cmd-panel p-4 ${critical ? "cmd-panel--danger" : ""}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="section-eyebrow"><AlertTriangle className="w-3 h-3" /> Limite Anual · {taxCfg.label}</span>
                  <span className={`status-pill ${critical ? "status-pill--danger" : pct >= 70 ? "status-pill--warn" : "status-pill--live"}`}>{pct}%</span>
                </div>
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {fmtBRL(yearRevenue)} <span className="text-muted-foreground font-normal text-xs">de {fmtBRL(taxCfg.limit)}</span>
                </p>
                <Progress value={pct} className={`h-1.5 mt-2 ${critical ? "[&>div]:bg-red-500" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"}`} />
                <p className="text-[10px] text-muted-foreground mt-1.5">Últimos 12 meses (pedidos pagos)</p>
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* ── Chart ─────────────────────────────────────────── */}
      <div className="cmd-panel p-5 animate-dashboard-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-eyebrow"><Activity className="w-3 h-3" /> Últimos 7 dias</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalLast7Orders} pedido{totalLast7Orders !== 1 ? "s" : ""} no período · faturamento em R$
            </p>
          </div>
        </div>
          {delivered.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-3">
                <svg width="64" height="64" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
                  <defs>
                    <radialGradient id="mailPulse" cx="50%" cy="50%" r="50%">
                      <animate attributeName="r" values="30%;50%;30%" dur="3s" repeatCount="indefinite" />
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="48" cy="48" r="44" fill="url(#mailPulse)" />
                  <g stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="3s" repeatCount="indefinite" />
                    <rect x="24" y="36" width="48" height="32" rx="4" />
                    <path d="M24 40l24 16 24-16" />
                    <line x1="48" y1="24" x2="48" y2="32" />
                    <line x1="38" y1="26" x2="42" y2="32" />
                    <line x1="58" y1="26" x2="54" y2="32" />
                  </g>
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Nenhum pedido entregue ainda. Os dados aparecerão aqui!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={last7} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  yAxisId="left"
                  width={35}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={55}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card) / 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border) / 0.5)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value, name) => {
                    if (name === "faturamento") return [fmtBRL(Number(value)), "Faturamento"];
                    return [value, "Pedidos"];
                  }}
                />
                <Legend
                  formatter={(value) => (value === "pedidos" ? "Pedidos" : "Faturamento (R$)")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar yAxisId="left" dataKey="pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#22c55e" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* ── Payment method chart ──────────────────────────── */}
      <div className="cmd-panel p-5 animate-dashboard-slide-up">
        <div className="mb-4">
          <div className="section-eyebrow"><Wallet className="w-3 h-3" /> Faturamento por método</div>
          <p className="text-xs text-muted-foreground mt-1">Total no período: {fmtBRL(paymentTotal)}</p>
        </div>
          {delivered.filter(o => o.paid).length === 0 ? (
            <div className="text-center py-12">
              <div className="flex justify-center mb-3">
                <svg width="64" height="64" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
                  <defs>
                    <radialGradient id="cardPulse" cx="50%" cy="50%" r="50%">
                      <animate attributeName="r" values="30%;50%;30%" dur="3s" repeatCount="indefinite" />
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.10" />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <circle cx="48" cy="48" r="44" fill="url(#cardPulse)" />
                  <g stroke="hsl(var(--muted-foreground))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="3s" repeatCount="indefinite" />
                    <rect x="18" y="30" width="60" height="36" rx="5" />
                    <line x1="18" y1="42" x2="78" y2="42" />
                    <rect x="26" y="50" width="18" height="6" rx="2" />
                    <circle cx="66" cy="53" r="4" />
                    <circle cx="60" cy="53" r="4" />
                  </g>
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Nenhum pedido pago ainda. Os dados aparecerão aqui!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={paymentChartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  width={55}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card) / 0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border) / 0.5)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [fmtBRL(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Dinheiro" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="PIX" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Cartão" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>

      {/* ── Install app (subtle) ─────────────────────────── */}
      {!isStandalone && (
        <button
          onClick={() => navigate("/instalar")}
          className="w-full cmd-panel p-4 flex items-center gap-3 hover:cmd-panel--accent transition-all text-left group"
        >
          <div className="action-tile__icon w-9 h-9">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Instalar TrendFood no celular</p>
            <p className="text-[11px] text-muted-foreground">Acesso 1-clique direto da home screen</p>
          </div>
          <Download className="w-4 h-4 text-primary group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Versão do build — diagnóstico rápido */}
      <p className="text-center text-[10px] text-muted-foreground/60 font-mono pt-2">
        v{(() => { try { return typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev"; } catch { return "dev"; } })()}
      </p>
    </div>
  );
}
