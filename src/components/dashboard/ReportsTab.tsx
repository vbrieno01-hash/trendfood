import { useState, useMemo } from "react";
import { useOrderHistory } from "@/hooks/useOrders";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, ShoppingCart, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Minus, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportsTabProps {
  orgId: string;
}

type Period = "7d" | "30d" | "90d";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

export default function ReportsTab({ orgId }: ReportsTabProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const queryPeriod = period === "90d" ? "all" : period;
  const { data: orders = [], isLoading } = useOrderHistory(orgId, queryPeriod);

  // Filter orders to selected period for 90d
  const filteredOrders = useMemo(() => {
    if (period !== "90d") return orders;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return orders.filter((o) => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  // KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredOrders.reduce(
      (sum, o) => sum + (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0),
      0
    );
    const totalOrders = filteredOrders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const days = new Set(filteredOrders.map((o) => o.created_at.slice(0, 10))).size || 1;
    const avgOrdersPerDay = totalOrders / days;

    return { totalRevenue, totalOrders, avgTicket, avgOrdersPerDay };
  }, [filteredOrders]);

  // Daily revenue chart
  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const day = o.created_at.slice(0, 10);
      const total = (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
      map[day] = (map[day] ?? 0) + total;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        revenue,
      }));
  }, [filteredOrders]);

  // Peak hours
  const peakHours = useMemo(() => {
    const hourCounts = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, pedidos: 0 }));
    filteredOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      hourCounts[h].pedidos++;
    });
    return hourCounts;
  }, [filteredOrders]);

  const maxPeakHour = useMemo(() => Math.max(...peakHours.map((h) => h.pedidos), 1), [peakHours]);

  // Weekly comparison
  const weeklyComparison = useMemo(() => {
    const now = new Date();
    const startThisWeek = new Date(now);
    startThisWeek.setDate(now.getDate() - now.getDay());
    startThisWeek.setHours(0, 0, 0, 0);
    const startLastWeek = new Date(startThisWeek);
    startLastWeek.setDate(startLastWeek.getDate() - 7);

    let thisWeek = 0;
    let lastWeek = 0;

    filteredOrders.forEach((o) => {
      const d = new Date(o.created_at);
      const total = (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
      if (d >= startThisWeek) thisWeek += total;
      else if (d >= startLastWeek && d < startThisWeek) lastWeek += total;
    });

    const change = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : thisWeek > 0 ? 100 : 0;
    return { thisWeek, lastWeek, change };
  }, [filteredOrders]);

  // Category ranking
  const categoryRanking = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number }> = {};
    filteredOrders.forEach((o) => {
      (o.order_items ?? []).forEach((item) => {
        const cat = (item as any).category || "Outros";
        if (!map[cat]) map[cat] = { revenue: 0, qty: 0 };
        map[cat].revenue += item.price * item.quantity;
        map[cat].qty += item.quantity;
      });
    });

    // If no category data, group by item name instead
    if (Object.keys(map).length <= 1) {
      const itemMap: Record<string, { revenue: number; qty: number }> = {};
      filteredOrders.forEach((o) => {
        (o.order_items ?? []).forEach((item) => {
          if (!itemMap[item.name]) itemMap[item.name] = { revenue: 0, qty: 0 };
          itemMap[item.name].revenue += item.price * item.quantity;
          itemMap[item.name].qty += item.quantity;
        });
      });
      return Object.entries(itemMap)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data }));
    }

    return Object.entries(map)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .map(([name, data]) => ({ name, ...data }));
  }, [filteredOrders]);

  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? period;

  const handleDownloadReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;

    const dailyRows = dailyRevenue
      .map((d) => `<tr><td>${d.date}</td><td>${fmtBRL(d.revenue)}</td></tr>`)
      .join("");

    const rankingRows = categoryRanking
      .map((c, i) => `<tr><td>${i + 1}</td><td>${c.name}</td><td>${fmtBRL(c.revenue)}</td><td>${c.qty}</td></tr>`)
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Vendas</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#1a1a1a}
  h1{font-size:20px;margin-bottom:4px}
  h2{font-size:15px;margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee}
  th{font-weight:600;background:#f9f9f9}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}
  .kpi{padding:12px;border:1px solid #eee;border-radius:8px}
  .kpi .label{font-size:12px;color:#666}.kpi .value{font-size:18px;font-weight:700}
  @media print{body{padding:0}button{display:none}}
</style></head><body>
<h1>Relatório de Vendas</h1>
<p class="sub">Período: ${periodLabel}</p>

<div class="kpi-grid">
  <div class="kpi"><div class="label">Faturamento</div><div class="value">${fmtBRL(kpis.totalRevenue)}</div></div>
  <div class="kpi"><div class="label">Ticket Médio</div><div class="value">${fmtBRL(kpis.avgTicket)}</div></div>
  <div class="kpi"><div class="label">Total Pedidos</div><div class="value">${kpis.totalOrders}</div></div>
  <div class="kpi"><div class="label">Pedidos/dia</div><div class="value">${kpis.avgOrdersPerDay.toFixed(1)}</div></div>
</div>

<h2>Comparativo Semanal</h2>
<table><thead><tr><th>Semana Atual</th><th>Semana Anterior</th><th>Variação</th></tr></thead>
<tbody><tr><td>${fmtBRL(weeklyComparison.thisWeek)}</td><td>${fmtBRL(weeklyComparison.lastWeek)}</td><td>${weeklyComparison.change > 0 ? "+" : ""}${weeklyComparison.change.toFixed(1)}%</td></tr></tbody></table>

${dailyRevenue.length > 0 ? `<h2>Faturamento Diário</h2><table><thead><tr><th>Data</th><th>Receita</th></tr></thead><tbody>${dailyRows}</tbody></table>` : ""}

${categoryRanking.length > 0 ? `<h2>Ranking por Item / Categoria</h2><table><thead><tr><th>#</th><th>Item</th><th>Receita</th><th>Qtd</th></tr></thead><tbody>${rankingRows}</tbody></table>` : ""}

<script>window.onload=function(){window.print()}<\/script>
</body></html>`;

    w.document.write(html);
    w.document.close();
  };

  if (isLoading) {
    return (
      <div className="text-center py-16 text-muted-foreground animate-pulse">
        Carregando relatórios…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header + Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatórios Avançados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Análise completa do desempenho da sua operação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === opt.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-1" />
            Baixar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-muted-foreground">Faturamento</span>
            </div>
            <p className="font-bold text-foreground text-xl">{fmtBRL(kpis.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-muted-foreground">Ticket Médio</span>
            </div>
            <p className="font-bold text-foreground text-xl">{fmtBRL(kpis.avgTicket)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Total Pedidos</span>
            </div>
            <p className="font-bold text-foreground text-xl">{kpis.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs text-muted-foreground">Pedidos/dia</span>
            </div>
            <p className="font-bold text-foreground text-xl">{kpis.avgOrdersPerDay.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly comparison */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Comparativo Semanal</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Semana atual</p>
              <p className="font-bold text-foreground text-lg">{fmtBRL(weeklyComparison.thisWeek)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Semana anterior</p>
              <p className="font-bold text-foreground text-lg">{fmtBRL(weeklyComparison.lastWeek)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Variação</p>
              <div className="flex items-center gap-1">
                {weeklyComparison.change > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : weeklyComparison.change < 0 ? (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
                <p className={`font-bold text-lg ${
                  weeklyComparison.change > 0 ? "text-emerald-600" : weeklyComparison.change < 0 ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {weeklyComparison.change > 0 ? "+" : ""}{weeklyComparison.change.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily revenue chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Faturamento Diário</h3>
          {dailyRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados para o período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tickFormatter={(v) => `R$${(v / 1).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={65}
                />
                <Tooltip
                  formatter={(value: number) => [fmtBRL(value), "Receita"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Peak hours */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Horários de Pico</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={1} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={35} />
              <Tooltip
                formatter={(value: number) => [value, "Pedidos"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="pedidos" radius={[3, 3, 0, 0]}>
                {peakHours.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.pedidos >= maxPeakHour * 0.7
                      ? "hsl(var(--primary))"
                      : entry.pedidos > 0
                        ? "hsl(var(--primary) / 0.4)"
                        : "hsl(var(--muted))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category ranking */}
      {categoryRanking.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Ranking por Item / Categoria</h3>
            <div className="space-y-2">
              {categoryRanking.map((cat, i) => {
                const maxRevenue = categoryRanking[0]?.revenue || 1;
                const pct = (cat.revenue / maxRevenue) * 100;
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right font-medium">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{cat.name}</span>
                        <span className="text-sm text-muted-foreground shrink-0 ml-2">
                          {fmtBRL(cat.revenue)} ({cat.qty} un.)
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
