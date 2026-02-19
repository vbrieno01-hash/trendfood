import { useDeliveredOrders, useDeliveredUnpaidOrders } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend,
} from "recharts";
import { DollarSign, ShoppingBag, Clock, TrendingUp } from "lucide-react";
import { subDays, format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  primary_color: string;
  logo_url: string | null;
  subscription_status?: string;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HomeTab({ organization }: { organization: Organization }) {
  const { data: delivered = [], isLoading: loadingDelivered } = useDeliveredOrders(organization.id);
  const { data: unpaid = [], isLoading: loadingUnpaid } = useDeliveredUnpaidOrders(organization.id);

  const isLoading = loadingDelivered || loadingUnpaid;

  // ── Today's stats ──────────────────────────────────────────────
  const today = startOfDay(new Date());
  const todayDelivered = delivered.filter((o) => isSameDay(new Date(o.created_at), today));

  const totalRevenue = delivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

  const todayRevenue = todayDelivered
    .filter((o) => o.paid)
    .reduce((acc, o) => acc + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0), 0);

  const pendingPayment = unpaid.length;

  const avgTicket =
    delivered.filter((o) => o.paid).length > 0
      ? totalRevenue / delivered.filter((o) => o.paid).length
      : 0;

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

  const stats = [
    {
      label: "Faturamento pago (total)",
      value: fmtBRL(totalRevenue),
      icon: <DollarSign className="w-5 h-5" />,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pedidos entregues hoje",
      value: todayDelivered.length,
      icon: <ShoppingBag className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Aguardando pagamento",
      value: pendingPayment,
      icon: <Clock className="w-5 h-5" />,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Ticket médio por pedido",
      value: fmtBRL(avgTicket),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá! 👋 {organization.emoji} {organization.name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">Resumo do seu negócio</p>
          {organization.subscription_status && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                organization.subscription_status === "active"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : organization.subscription_status === "inactive"
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
            >
              {organization.subscription_status === "active"
                ? "✓ Plano Ativo"
                : organization.subscription_status === "inactive"
                ? "✗ Inativo"
                : "⏳ Período de Teste"}
            </span>
          )}
        </div>
      </div>

      {/* Today revenue highlight */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-5 flex items-center justify-between shadow-md">
        <div>
          <p className="text-sm opacity-80 font-medium">Faturamento Hoje</p>
          <p className="text-3xl font-black mt-1">{fmtBRL(todayRevenue)}</p>
          <p className="text-xs opacity-70 mt-0.5">{todayDelivered.filter((o) => o.paid).length} pedido(s) pago(s)</p>
        </div>
        <DollarSign className="w-12 h-12 opacity-20" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-border shadow-sm">
            <CardContent className="p-4 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <p className="text-xl font-black text-foreground leading-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-5">
          <h2 className="font-bold text-foreground text-base mb-4">📊 Últimos 7 dias</h2>
          {delivered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-muted-foreground text-sm">Nenhum pedido entregue ainda. Os dados aparecerão aqui!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={last7} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
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
