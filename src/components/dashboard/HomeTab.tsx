import { useDeliveredOrders, useDeliveredUnpaidOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend,
} from "recharts";
import { DollarSign, ShoppingBag, Clock, TrendingUp, TrendingDown, Minus, PauseCircle, PlayCircle, Loader2 } from "lucide-react";
import { subDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

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
  const { refreshOrganization } = useAuth();
  const [pauseLoading, setPauseLoading] = useState(false);

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

  // ── Today's stats ──────────────────────────────────────────────
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const todayDelivered = delivered.filter((o) => isSameDay(new Date(o.created_at), today));
  const yesterdayDelivered = delivered.filter((o) => isSameDay(new Date(o.created_at), yesterday));

  const totalRevenue = delivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

  const todayRevenue = todayDelivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

  const yesterdayRevenue = yesterdayDelivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

  const pendingPayment = unpaid.length;

  const avgTicket =
    delivered.filter((o) => o.paid).length > 0
      ? totalRevenue / delivered.filter((o) => o.paid).length
      : 0;

  // Revenue trend vs yesterday
  const revenueDelta =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null;

  // ── Last 7 days chart data ─────────────────────────────────────
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayOrders = delivered.filter((o) => isSameDay(new Date(o.created_at), day));
    const revenue = dayOrders
      .filter((o) => o.paid)
      .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, it) => s + it.price * it.quantity, 0), 0);
    return {
      dia: format(day, "EEE", { locale: ptBR }),
      pedidos: dayOrders.length,
      faturamento: Math.round(revenue * 100) / 100,
    };
  });

  const totalLast7Orders = last7.reduce((s, d) => s + d.pedidos, 0);

  const stats = [
    {
      label: "Faturamento total",
      value: fmtBRL(totalRevenue),
      icon: <DollarSign className="w-5 h-5" />,
      color: "text-green-600",
      border: "border-green-200",
      bg: "bg-green-50",
    },
    {
      label: "Pedidos entregues hoje",
      value: todayDelivered.length,
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "text-blue-600",
      border: "border-blue-200",
      bg: "bg-blue-50",
    },
    {
      label: "Aguardando pagamento",
      value: pendingPayment,
      icon: <Clock className="w-5 h-5" />,
      color: "text-amber-600",
      border: "border-amber-200",
      bg: "bg-amber-50",
    },
    {
      label: "Ticket médio",
      value: fmtBRL(avgTicket),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-600",
      border: "border-purple-200",
      bg: "bg-purple-50",
    },
  ];

  // Date header
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground leading-tight tracking-tight">
            {organization.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">{todayCapitalized}</p>
        </div>
        {organization.subscription_status && (
          <span
            className={`mt-1 text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0 ${
              organization.subscription_status === "active"
                ? "bg-green-50 text-green-700 border-green-200"
                : organization.subscription_status === "inactive"
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {organization.subscription_status === "active"
              ? "✓ Plano Ativo"
              : organization.subscription_status === "inactive"
              ? "✗ Inativo"
              : "Período de Teste"}
          </span>
        )}
      </div>

      {/* ── Pause toggle ─────────────────────────────────── */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${organization.paused ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
        <div className="flex items-center gap-3">
          {organization.paused ? (
            <PauseCircle className="w-5 h-5 text-amber-600" />
          ) : (
            <PlayCircle className="w-5 h-5 text-green-600" />
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
        className="rounded-2xl text-white p-5 flex items-center justify-between shadow-lg overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, hsl(0 84% 46%), hsl(0 84% 35%))",
        }}
      >
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
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
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border ${stat.border} ${stat.bg} p-4 flex flex-col gap-3`}
          >
            <div className={`${stat.color}`}>
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
      <Card className="border border-border shadow-sm">
        <CardContent className="p-5">
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
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
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
        </CardContent>
      </Card>
    </div>
  );
}
