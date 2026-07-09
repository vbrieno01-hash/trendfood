import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar as BarRaw,
  LineChart,
  Line as LineRaw,
  XAxis as XAxisRaw,
  YAxis as YAxisRaw,
  CartesianGrid,
  Tooltip as TooltipRaw,
  Legend as LegendRaw,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, AlertTriangle, Users, Calendar as CalendarIcon, BarChart3, LineChart as LineChartIcon, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CommandPanel, MetricTile } from "@/components/dashboard/command";
import { useCashAnalytics } from "@/hooks/useCashAnalytics";

// Cast recharts para React 18 aceitar
/* eslint-disable @typescript-eslint/no-explicit-any */
const XAxis = XAxisRaw as any;
const YAxis = YAxisRaw as any;
const Tooltip = TooltipRaw as any;
const Legend = LegendRaw as any;
const Bar = BarRaw as any;
const Line = LineRaw as any;
/* eslint-enable */

type Preset = "7" | "30" | "90" | "custom";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtShort = (iso: string) =>
  format(new Date(iso), "dd/MM HH:mm", { locale: ptBR });

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function CashAnalytics({ orgId }: { orgId: string }) {
  const [preset, setPreset] = useState<Preset>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    if (preset === "custom" && customFrom && customTo) {
      return {
        fromIso: startOfDay(customFrom).toISOString(),
        toIso: endOfDay(customTo).toISOString(),
      };
    }
    const days = preset === "7" ? 7 : preset === "90" ? 90 : 30;
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    return {
      fromIso: startOfDay(from).toISOString(),
      toIso: endOfDay(now).toISOString(),
    };
  }, [preset, customFrom, customTo]);

  const { isLoading, sessions, totals, operatorRanking, operatorAlerts } =
    useCashAnalytics(orgId, fromIso, toIso);

  const chartData = useMemo(
    () =>
      sessions.map((s, i) => ({
        idx: i + 1,
        label: fmtShort(s.openedAt),
        receita: Number(s.revenue.total.toFixed(2)),
        divergencia: Number(s.divergence.toFixed(2)),
        dinheiro: Number(s.revenue.dinheiro.toFixed(2)),
        pix: Number(s.revenue.pix.toFixed(2)),
        cartao: Number(s.revenue.cartao.toFixed(2)),
        outros: Number(s.revenue.outros.toFixed(2)),
      })),
    [sessions]
  );

  const presetButton = (value: Preset, label: string) => (
    <Button
      key={value}
      size="sm"
      variant={preset === value ? "default" : "outline"}
      onClick={() => setPreset(value)}
    >
      {label}
    </Button>
  );

  return (
    <CommandPanel
      eyebrow="Análise"
      title="Comparativo de turnos"
      padding="lg"
      className="space-y-6"
    >
      {/* Filtro de período */}
      <div className="flex flex-wrap items-center gap-2">
        {presetButton("7", "7 dias")}
        {presetButton("30", "30 dias")}
        {presetButton("90", "90 dias")}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={preset === "custom" ? "default" : "outline"}
              onClick={() => setPreset("custom")}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              {preset === "custom" && customFrom && customTo
                ? `${format(customFrom, "dd/MM")} — ${format(customTo, "dd/MM")}`
                : "Personalizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">De</div>
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                className={cn("p-0 pointer-events-auto")}
              />
              <div className="text-xs font-medium text-muted-foreground pt-2">Até</div>
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                className={cn("p-0 pointer-events-auto")}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Alerta padrão divergência */}
      {operatorAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold">Atenção com divergências recorrentes</div>
            {operatorAlerts.map((op) => (
              <div key={op.operatorId} className="text-xs">
                <strong>{op.operatorName}</strong> teve {op.criticalCount} turnos com divergência acima de R$ 5 no período.
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Receita total"
          value={fmt(totals.revenue)}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <MetricTile
          label="Ticket médio/turno"
          value={fmt(totals.avgTicket)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricTile
          label="Divergência acumulada"
          value={fmt(totals.divergenceAbs)}
          hint={`${totals.divergencePct.toFixed(2)}% da receita`}
          icon={<AlertCircle className="w-4 h-4" />}
        />
        <MetricTile
          label="Turnos analisados"
          value={String(totals.sessionCount)}
          icon={<Users className="w-4 h-4" />}
        />
      </div>

      {/* Empty / Loading / Gráficos */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
          <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm text-muted-foreground">
            Sem turnos fechados no período selecionado.
          </p>
        </div>
      ) : (
        <>
          {/* Linha: receita + divergência */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
              <LineChartIcon className="w-4 h-4 text-primary" />
              Evolução por turno
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="receita"
                    name="Receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="divergencia"
                    name="Divergência"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Barras empilhadas por forma de pagamento */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
              <BarChart3 className="w-4 h-4 text-primary" />
              Receita por forma de pagamento
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="dinheiro" name="Dinheiro" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="pix" name="PIX" stackId="a" fill="hsl(var(--chart-2, var(--primary)))" fillOpacity={0.75} />
                  <Bar dataKey="cartao" name="Cartão" stackId="a" fill="hsl(var(--accent-foreground))" fillOpacity={0.55} />
                  <Bar dataKey="outros" name="Outros" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking operadores (só se 2+) */}
          {operatorRanking.length >= 2 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
                <Users className="w-4 h-4 text-primary" />
                Ranking de operadores
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operador</TableHead>
                      <TableHead className="text-right">Turnos</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Divergência média</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operatorRanking.map((op) => {
                      const critical = Math.abs(op.avgDivergence) > 5;
                      return (
                        <TableRow key={op.operatorId}>
                          <TableCell className="text-sm">{op.operatorName}</TableCell>
                          <TableCell className="text-right text-sm">{op.sessions}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(op.revenue)}</TableCell>
                          <TableCell className="text-right text-sm">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                critical && "text-destructive font-medium"
                              )}
                            >
                              {op.avgDivergence >= 0 ? "+" : ""}
                              {fmt(op.avgDivergence)}
                              <span className="text-xs text-muted-foreground">
                                ({op.avgDivergencePct.toFixed(1)}%)
                              </span>
                              {critical && (
                                <Badge variant="destructive" className="ml-1 text-[10px] py-0 px-1.5">
                                  Atenção
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </CommandPanel>
  );
}

export default CashAnalytics;