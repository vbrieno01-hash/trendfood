import { useDeliveredOrders, useDeliveredUnpaidOrders, useOrders } from "@/hooks/useOrders";
import { extractDeliveryFee } from "@/lib/formatReceiptText";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend, BarChart,
} from "recharts";
import { DollarSign, ShoppingBag, Clock, TrendingUp, TrendingDown, Minus, PauseCircle, PlayCircle, Loader2, ClipboardList, LayoutGrid, AlertTriangle, Wallet, Bell, BellOff, Download, Smartphone, ChevronRight } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 animate-dashboard-fade-in">
        <div>
          <h1 className="text-3xl font-black text-foreground leading-tight tracking-tight">
            {organization.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{todayCapitalized}</p>
        </div>
        <div className="flex items-center gap-2">
          {pushSupported && (
            <button
              onClick={async () => {
                if (isSubscribed) {
                  await pushUnsubscribe();
                  toast.success("Notificações desativadas");
                } else {
                  const ok = await pushSubscribe();
                  if (ok) toast.success("Notificações ativadas! 🔔");
                  else toast("Permissão de notificação negada", { description: "Ative nas configurações do navegador" });
                }
              }}
              disabled={pushLoading}
              className={`relative p-2 rounded-xl transition-colors ${
                isSubscribed
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground border border-border hover:bg-accent"
              }`}
              title={isSubscribed ? "Notificações ativas" : "Ativar notificações"}
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              {isSubscribed && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          )}
          {organization.subscription_status && (
            <span
              className={`mt-1 text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0 ${
                organization.subscription_status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : organization.subscription_status === "inactive"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }`}
            >
              {organization.subscription_status === "active"
                ? "✓ Plano Ativo"
                : organization.subscription_status === "inactive"
                ? "✗ Inativo"
                : "Período de Teste"}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1 animate-admin-pulse-live">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            live
          </span>
        </div>
      </div>

      {/* ── Setup Checklist ─────────────────────────────── */}
      {onNavigate && (
        <SetupChecklist
          orgId={organization.id}
          orgWhatsapp={organization.whatsapp}
          orgAddress={organization.store_address}
          orgLogoUrl={organization.logo_url}
          orgPrintMode={(organization as any)?.print_mode}
          onNavigate={onNavigate}
        />
      )}

      {/* ── Aviso de assinatura expirando (3 dias) ────────── */}
      {planLimits.subscriptionDaysLeft > 0 && planLimits.subscriptionDaysLeft <= 3 && onNavigate && (
        <button
          onClick={() => onNavigate("subscription")}
          className="w-full dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors group animate-dashboard-fade-in"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Sua assinatura expira em {planLimits.subscriptionDaysLeft} dia{planLimits.subscriptionDaysLeft !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Renove agora pra não perder acesso aos recursos premium. Seus dados continuam salvos.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* ── Aviso de assinatura expirada ──────────────────── */}
      {planLimits.subscriptionExpired && onNavigate && (
        <button
          onClick={() => onNavigate("subscription")}
          className="w-full dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group animate-dashboard-fade-in"
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Assinatura expirada — recursos premium bloqueados</p>
            <p className="text-xs text-muted-foreground">
              Seus cupons, fidelidade, KDS e demais dados continuam salvos. Renove pra liberar tudo de volta.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* ── Avisos críticos de configuração de horário ─────── */}
      {(!organization.business_hours?.enabled || organization.force_open) && onNavigate && (
        <div className="space-y-3 animate-dashboard-fade-in">
          {!organization.business_hours?.enabled && (
            <button
              onClick={() => onNavigate("settings")}
              className="w-full dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Horário de funcionamento não configurado</p>
                <p className="text-xs text-muted-foreground">Sua loja aparece como sempre aberta para os clientes. Configure agora.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {organization.force_open && (
            <button
              onClick={() => onNavigate("settings")}
              className="w-full dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">"Forçar abertura" ativado</p>
                <p className="text-xs text-muted-foreground">A loja aceita pedidos mesmo fora do horário. Lembre-se de desativar quando fechar.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* ── Action Cards ──────────────────────────────────── */}
      {(activeOrders.length > 0 || lowStockCount > 0) && onNavigate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-dashboard-fade-in">
          {activeOrders.length > 0 && (
            <button
              onClick={() => onNavigate("operations")}
              className="dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""} ativo{activeOrders.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Toque para gerenciar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {lowStockCount > 0 && (
            <button
              onClick={() => onNavigate("stock")}
              className="dashboard-glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-accent/50 transition-colors group border-destructive/30"
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{lowStockCount} item{lowStockCount !== 1 ? "ns" : ""} com estoque baixo</p>
                <p className="text-xs text-muted-foreground">Toque para repor</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* ── Quick Summary ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="dashboard-glass rounded-2xl p-4 flex items-center gap-3 animate-dashboard-fade-in dash-delay-1">
          <div className="dashboard-section-icon">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground leading-tight">{activeOrders.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Pedidos Ativos</p>
          </div>
        </div>
        <div className="dashboard-glass rounded-2xl p-4 flex items-center gap-3 animate-dashboard-fade-in dash-delay-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground leading-tight">{occupiedTables}</p>
            <p className="text-xs text-muted-foreground font-medium">Mesas Ocupadas</p>
          </div>
        </div>
        <div className={`dashboard-glass rounded-2xl p-4 flex items-center gap-3 animate-dashboard-fade-in dash-delay-3 ${lowStockCount > 0 ? "!border-destructive/40 animate-neon-pulse shadow-lg shadow-destructive/20" : ""}`}>
          <div className={`p-2 rounded-xl flex items-center justify-center text-white ${lowStockCount > 0 ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground leading-tight">{lowStockCount}</p>
            <p className="text-xs text-muted-foreground font-medium">Estoque Baixo</p>
          </div>
        </div>
      </div>

      {/* ── Install App Card ──────────────────────────────── */}
      {!isStandalone && (
        <button
          onClick={() => navigate("/instalar")}
          className="w-full dashboard-glass rounded-2xl p-4 flex items-center justify-between gap-3 animate-dashboard-fade-in dash-delay-4 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Instalar TrendFood</p>
              <p className="text-xs text-muted-foreground">Acesse direto da tela inicial do celular</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-primary flex-shrink-0" />
        </button>
      )}

      {/* ── Pause toggle ─────────────────────────────────── */}
      <div className={`dashboard-glass rounded-2xl p-4 flex items-center justify-between gap-3 animate-dashboard-fade-in dash-delay-4 ${organization.paused ? "!border-amber-500/30" : ""}`}>
        <div className="flex items-center gap-3">
          {organization.paused ? (
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <PauseCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <PlayCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {organization.paused ? "Loja Pausada" : "Loja Ativa"}
            </p>
            <p className="text-xs text-muted-foreground">
              {organization.paused ? "Clientes não podem fazer pedidos" : "Pedidos sendo recebidos normalmente"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pauseLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={!organization.paused}
            onCheckedChange={togglePause}
            disabled={pauseLoading}
          />
        </div>
      </div>

      {/* ── Billing Alert ─────────────────────────────────── */}
      {(() => {
        const limit = (organization as any).billing_alert_limit;
        if (!limit || limit <= 0) return null;
        const monthStart = startOfMonth(new Date());
        const monthRevenue = delivered
          .filter((o) => o.paid && new Date(o.created_at) >= monthStart)
          .reduce((acc, o) => acc + orderTotal(o), 0);
        const pct = Math.min(Math.round((monthRevenue / limit) * 100), 100);
        const color = pct >= 80 ? "from-red-500 to-red-600" : pct >= 60 ? "from-amber-500 to-amber-600" : "from-emerald-500 to-emerald-600";
        const barColor = pct >= 80 ? "[&>div]:bg-red-500" : pct >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500";
        return (
          <div className={`dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-4 ${pct >= 80 ? "!border-red-500/40" : ""}`}>
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limite de Faturamento Mensal</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-foreground">
                  {fmtBRL(monthRevenue)} <span className="text-muted-foreground font-normal">de {fmtBRL(limit)}</span>
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${color}`}>{pct}%</span>
              </div>
              <Progress value={pct} className={`h-2.5 ${barColor}`} />
              {pct >= 80 && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Atenção: próximo do limite definido
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Annual Revenue Alert (tax regime) ─────────────── */}
      {(() => {
        const taxRegime = (organization as any).tax_regime as string | null;
        if (!taxRegime) return null;
        const annualLimits: Record<string, { limit: number; label: string }> = {
          mei: { limit: 81000, label: "MEI" },
          cpf: { limit: 27110.4, label: "CPF" },
          me: { limit: 360000, label: "ME" },
        };
        const cfg = annualLimits[taxRegime];
        if (!cfg) return null;
        const twelveMonthsAgo = subMonths(new Date(), 12);
        const yearRevenue = delivered
          .filter((o) => o.paid && new Date(o.created_at) >= twelveMonthsAgo)
          .reduce((acc, o) => acc + orderTotal(o), 0);
        const pct = Math.min(Math.round((yearRevenue / cfg.limit) * 100), 100);
        const color = pct >= 85 ? "from-red-500 to-red-600" : pct >= 70 ? "from-amber-500 to-amber-600" : "from-emerald-500 to-emerald-600";
        const barColor = pct >= 85 ? "[&>div]:bg-red-500" : pct >= 70 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500";
        return (
          <div className={`dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in dash-delay-4 ${pct >= 85 ? "!border-red-500/40" : ""}`}>
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limite Anual — {cfg.label}</p>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-foreground">
                  {fmtBRL(yearRevenue)} <span className="text-muted-foreground font-normal">de {fmtBRL(cfg.limit)}</span>
                </p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${color}`}>{pct}%</span>
              </div>
              <Progress value={pct} className={`h-2.5 ${barColor}`} />
              <p className="text-[10px] text-muted-foreground">Faturamento dos últimos 12 meses (pedidos pagos)</p>
              {pct >= 85 && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Atenção: Você atingiu {pct}% do limite anual do {cfg.label}. Procure seu contador para evitar multas.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Today revenue hero ────────────────────────────── */}
      <div
        className="rounded-2xl text-white p-5 flex items-center justify-between shadow-lg overflow-hidden relative animate-dashboard-slide-up dash-delay-5"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative z-10">
          <p className="text-sm text-white/70 font-medium uppercase tracking-wider">Faturamento Hoje</p>
          <p className="text-4xl font-black mt-1 tracking-tight">{fmtBRL(todayRevenue)}</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-xs text-white/60">{todayDelivered.filter((o) => o.paid).length} pedido(s) pago(s)</p>
            {revenueDelta !== null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  revenueDelta > 0
                    ? "bg-white/20 text-white"
                    : revenueDelta < 0
                    ? "bg-black/20 text-white/80"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {revenueDelta > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : revenueDelta < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                {revenueDelta > 0 ? "+" : ""}{revenueDelta}% vs ontem
              </span>
            )}
          </div>
        </div>
        <TrendingUp className="relative z-10 w-14 h-14 text-white/20 flex-shrink-0" />
      </div>

      {/* ── Stats cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={stat.label}
            className={`dashboard-glass rounded-2xl p-4 flex flex-col gap-3 animate-dashboard-fade-in dash-delay-${idx + 1}`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} text-white flex items-center justify-center shadow-lg`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-foreground leading-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5 leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart ─────────────────────────────────────────── */}
      <div className="dashboard-glass rounded-2xl animate-dashboard-slide-up dash-delay-6">
        <div className="p-5">
          <div className="mb-4">
            <h2 className="font-black text-foreground text-base">Últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalLast7Orders} pedido{totalLast7Orders !== 1 ? "s" : ""} no período · faturamento em R$
            </p>
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
      </div>

      {/* ── Payment method chart ──────────────────────────── */}
      <div className="dashboard-glass rounded-2xl animate-dashboard-slide-up dash-delay-7">
        <div className="p-5">
          <div className="mb-4">
            <h2 className="font-black text-foreground text-base">Faturamento por Método de Pagamento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total no período: {fmtBRL(paymentTotal)}
            </p>
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
      </div>

      {/* Versão do build — diagnóstico rápido */}
      <p className="text-center text-[10px] text-muted-foreground/60 font-mono pt-2">
        v{(() => { try { return typeof __BUILD_VERSION__ !== "undefined" ? __BUILD_VERSION__ : "dev"; } catch { return "dev"; } })()}
      </p>
    </div>
  );
}
