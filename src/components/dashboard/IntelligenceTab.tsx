import { useMemo } from "react";
import { Brain, TrendingUp, TrendingDown, Flame, AlertTriangle, Sparkles, Clock, CalendarClock, Trophy } from "lucide-react";
import { CommandHeader, CommandPanel, MetricTile, CommandEmpty } from "@/components/dashboard/command";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useProfitAnalysis,
  useOrdersHeatmap,
  useWeekForecast,
  useSmartAlerts,
  HEATMAP_DAY_NAMES,
  type ProfitRow,
} from "@/hooks/useIntelligence";

interface Props {
  orgId: string;
  onNavigate?: (tab: string) => void;
}

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

// ────────────────────────────────────────────────────────────
// Bloco 1
// ────────────────────────────────────────────────────────────
function ProfitBlock({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useProfitAnalysis(orgId, true);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return (
      <CommandPanel eyebrow="Lucro Real" title="Onde está seu lucro?" padding="md">
        <p className="text-sm text-muted-foreground">Não foi possível calcular esse bloco agora. Tente novamente em alguns minutos.</p>
      </CommandPanel>
    );
  }

  const rows = data ?? [];
  const withRecipe = rows.filter((r) => r.has_recipe);
  const withoutRecipe = rows.filter((r) => !r.has_recipe);
  const top = withRecipe.slice(0, 10);
  const bestProfit = top[0];
  const bestSelling = [...rows].sort((a, b) => b.quantity_sold - a.quantity_sold)[0];

  return (
    <CommandPanel eyebrow="Lucro Real" title="Onde está seu lucro?" padding="md">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aguarde alguns pedidos para gerar seu ranking de lucro.
        </p>
      ) : withRecipe.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ainda não temos ficha técnica dos seus produtos. Cadastre os ingredientes para descobrir qual produto realmente dá mais lucro.
          </p>
          <p className="text-xs text-muted-foreground">
            {withoutRecipe.length} produto(s) sem ficha técnica cadastrada.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bestProfit && bestSelling && bestSelling.menu_item_id !== bestProfit.menu_item_id && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <strong className="text-foreground">{bestSelling.name}</strong> é o mais vendido, mas quem mais te dá lucro é <strong className="text-foreground">{bestProfit.name}</strong>. Cada venda de {bestProfit.name} rende <strong className="text-primary">{fmt(bestProfit.profit / bestProfit.quantity_sold)}</strong> de lucro. Vale destacar no cardápio.
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 font-semibold">#</th>
                  <th className="text-left py-2 font-semibold">Produto</th>
                  <th className="text-right py-2 font-semibold">Vendas</th>
                  <th className="text-right py-2 font-semibold">Lucro</th>
                  <th className="text-right py-2 font-semibold">Margem</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r: ProfitRow, i) => (
                  <tr key={r.menu_item_id} className="border-b border-border/50">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-right text-muted-foreground">{r.quantity_sold}×</td>
                    <td className="py-2 text-right font-mono font-semibold text-foreground">{fmt(r.profit)}</td>
                    <td className="py-2 text-right">
                      <MarginBadge pct={r.margin_pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withoutRecipe.length > 0 && (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                🧾 {withoutRecipe.length} produto(s) sem ficha técnica
              </summary>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground max-h-40 overflow-y-auto">
                {withoutRecipe.map((r) => (
                  <li key={r.menu_item_id}>
                    • {r.name} — {r.quantity_sold} vendas · {fmt(r.revenue)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Cadastre ingredientes na aba <strong>Cardápio</strong> pra ver o lucro real.
              </p>
            </details>
          )}
        </div>
      )}
    </CommandPanel>
  );
}

function MarginBadge({ pct }: { pct: number }) {
  const color = pct >= 50 ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
    : pct >= 20 ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold", color)}>
      {pct.toFixed(0)}%
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Bloco 2 — Heatmap
// ────────────────────────────────────────────────────────────
function HeatmapBlock({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useOrdersHeatmap(orgId, true);

  const insights = useMemo(() => {
    if (!data) return [];
    const out: string[] = [];
    if (data.peak) {
      out.push(`Seu pico é ${HEATMAP_DAY_NAMES[data.peak.day]} às ${data.peak.hour}h (${data.peak.count} pedidos nesse horário nos últimos 30 dias).`);
    }
    if (data.worstDay) {
      out.push(`${HEATMAP_DAY_NAMES[data.worstDay.day]} é seu dia mais fraco (${data.worstDay.total} pedidos no total). Que tal uma promoção nesse dia?`);
    }
    return out;
  }, [data]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) {
    return (
      <CommandPanel eyebrow="Horários" title="Quando sua loja bomba?" padding="md">
        <p className="text-sm text-muted-foreground">Não foi possível calcular esse bloco agora.</p>
      </CommandPanel>
    );
  }

  const matrix = data?.matrix ?? [];
  const max = matrix.reduce((m, row) => Math.max(m, ...row), 0);

  return (
    <CommandPanel eyebrow="Horários" title="Quando sua loja bomba?" padding="md">
      {(data?.totalOrders ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Aguarde alguns pedidos para gerar seu mapa de horários.</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="min-w-[520px]">
              <div className="grid grid-cols-[40px_repeat(24,minmax(18px,1fr))] gap-0.5 text-[10px] text-muted-foreground mb-1">
                <div />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="text-center">{h % 3 === 0 ? h : ""}</div>
                ))}
              </div>
              {matrix.map((row, d) => (
                <div key={d} className="grid grid-cols-[40px_repeat(24,minmax(18px,1fr))] gap-0.5 mb-0.5">
                  <div className="text-xs text-muted-foreground font-medium flex items-center">{HEATMAP_DAY_NAMES[d]}</div>
                  {row.map((count, h) => {
                    const intensity = max > 0 ? count / max : 0;
                    const bg = count === 0
                      ? "hsl(var(--muted) / 0.3)"
                      : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`;
                    return (
                      <div
                        key={h}
                        className="aspect-square rounded-sm"
                        style={{ background: bg }}
                        title={`${HEATMAP_DAY_NAMES[d]} ${h}h — ${count} pedido(s)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {insights.length > 0 && (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {insights.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </CommandPanel>
  );
}

// ────────────────────────────────────────────────────────────
// Bloco 3 — Previsão
// ────────────────────────────────────────────────────────────
function ForecastBlock({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useWeekForecast(orgId, true);

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (error) {
    return (
      <CommandPanel eyebrow="Previsão" title="Como vai fechar a semana?" padding="md">
        <p className="text-sm text-muted-foreground">Não foi possível calcular esse bloco agora.</p>
      </CommandPanel>
    );
  }

  const d = data!;
  const up = d.variationPct >= 0;
  const progress = d.projectedRevenue > 0 ? Math.min(100, (d.currentWeekRevenue / d.projectedRevenue) * 100) : 0;

  return (
    <CommandPanel eyebrow="Previsão" title="Como vai fechar a semana?" padding="md">
      {d.historicalWeeklyAvg === 0 && d.currentWeekRevenue === 0 ? (
        <p className="text-sm text-muted-foreground">Aguarde algumas semanas de vendas para gerar sua previsão.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Faturado até agora" value={fmt(d.currentWeekRevenue)} />
            <MetricTile label="Projeção pra domingo" value={fmt(d.projectedRevenue)} />
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso da semana</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {d.lastWeekRevenue > 0 && (
            <div className={cn(
              "rounded-xl border p-3 flex items-center gap-3",
              up ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
            )}>
              {up ? <TrendingUp className="w-5 h-5 text-emerald-500" /> : <TrendingDown className="w-5 h-5 text-amber-500" />}
              <div className="text-sm">
                <strong className={cn("font-semibold", up ? "text-emerald-500" : "text-amber-500")}>
                  {up ? "+" : ""}{d.variationPct.toFixed(0)}%
                </strong>{" "}
                {up ? "melhor" : "abaixo"} da semana passada ({fmt(d.lastWeekRevenue)})
              </div>
            </div>
          )}
        </div>
      )}
    </CommandPanel>
  );
}

// ────────────────────────────────────────────────────────────
// Bloco 4 — Alertas
// ────────────────────────────────────────────────────────────
function AlertsBlock({ orgId, onNavigate }: { orgId: string; onNavigate?: (tab: string) => void }) {
  const { data, isLoading, error } = useSmartAlerts(orgId, true);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error) {
    return (
      <CommandPanel eyebrow="Alertas" title="Fique de olho" padding="md">
        <p className="text-sm text-muted-foreground">Não foi possível calcular esse bloco agora.</p>
      </CommandPanel>
    );
  }

  const alerts = data ?? [];

  return (
    <CommandPanel eyebrow="Alertas" title="Fique de olho" padding="md">
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tudo tranquilo por aqui. Nenhum alerta pra hoje. ✨
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const styles = a.severity === "red"
              ? "border-destructive/40 bg-destructive/5"
              : a.severity === "yellow"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-emerald-500/40 bg-emerald-500/5";
            const Icon = a.severity === "green" ? Trophy : AlertTriangle;
            const iconColor = a.severity === "red" ? "text-destructive" : a.severity === "yellow" ? "text-amber-500" : "text-emerald-500";
            return (
              <div key={a.id} className={cn("rounded-xl border p-3 flex items-start gap-3", styles)}>
                <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{a.title}</p>
                  {a.detail && <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>}
                </div>
                {a.cta && onNavigate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => a.cta?.tab && onNavigate(a.cta.tab)}
                  >
                    {a.cta.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CommandPanel>
  );
}

// ────────────────────────────────────────────────────────────
// Tab principal
// ────────────────────────────────────────────────────────────
export default function IntelligenceTab({ orgId, onNavigate }: Props) {
  return (
    <div className="space-y-4">
      <CommandHeader
        eyebrow="👑 Enterprise"
        title="Inteligência do Negócio"
        subtitle="Descubra onde você está ganhando dinheiro e onde pode ganhar mais."
        icon={<Brain className="w-5 h-5" />}
      />

      <ProfitBlock orgId={orgId} />
      <HeatmapBlock orgId={orgId} />
      <ForecastBlock orgId={orgId} />
      <AlertsBlock orgId={orgId} onNavigate={onNavigate} />
    </div>
  );
}