import { useDeliveredOrders, useDeliveredUnpaidOrders, useOrders } from "@/hooks/useOrders";
import { extractDeliveryFee } from "@/lib/formatReceiptText";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend, BarChart,
} from "recharts";
import { DollarSign, ShoppingBag, Clock, TrendingUp, TrendingDown, Minus, PauseCircle, PlayCircle, Loader2, ClipboardList, LayoutGrid, AlertTriangle } from "lucide-react";
import { subDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  subscription_status?: string;
  paused?: boolean;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HomeTab({ organization }: { organization: Organization }) {
  const { data: delivered = [], isLoading: loadingDelivered } = useDeliveredOrders(organization.id);
  const { data: unpaid = [], isLoading: loadingUnpaid } = useDeliveredUnpaidOrders(organization.id);
  const { data: activeOrders = [] } = useOrders(organization.id, ["pending", "preparing"]);
  const { refreshOrganization } = useAuth();
  const [pauseLoading, setPauseLoading] = useState(false);

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
              <p className="text-3xl mb-2">📭</p>
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
              <p className="text-3xl mb-2">💳</p>
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
    </div>
  );
}
