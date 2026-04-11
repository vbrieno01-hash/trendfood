import { useState, useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useOrderHistory } from "@/hooks/useOrders";

interface BestSellersTabProps {
  orgId: string;
}

type Period = "today" | "7d" | "30d" | "all";

const periodOptions: { key: Period; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function BestSellersTab({ orgId }: BestSellersTabProps) {
  const [period, setPeriod] = useState<Period>("30d");

  const { data: orders = [], isLoading } = useOrderHistory(orgId, period);

  const ranked = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();

    orders.forEach((order) => {
      (order.order_items ?? []).forEach((item) => {
        const existing = map.get(item.name);
        if (existing) {
          existing.qty += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          map.set(item.name, {
            name: item.name,
            qty: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [orders]);

  const maxQty = ranked[0]?.qty ?? 1;
  const totalRevenue = ranked.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 animate-dashboard-fade-in">
        <div className="flex items-center gap-3">
          <div className="dashboard-section-icon">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-foreground text-xl">Mais Vendidos</h2>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {periodOptions.map((opt) => (
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
      </div>

      {/* Summary */}
      {!isLoading && ranked.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-1">
            <p className="text-xs text-muted-foreground">Itens únicos</p>
            <p className="font-bold text-foreground text-2xl">{ranked.length}</p>
          </div>
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-2">
            <p className="text-xs text-muted-foreground">Receita total</p>
            <p className="font-bold text-foreground text-2xl">{fmtBRL(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Ranked list */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando dados…</p>
      ) : ranked.length === 0 ? (
        <div className="text-center py-16 dashboard-glass rounded-2xl">
          <div className="relative mx-auto w-24 h-24 mb-3">
            <div className="animate-[float_3s_ease-in-out_infinite]">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                <circle cx="60" cy="60" r="50" fill="url(#chartGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <rect x="28" y="70" width="14" height="24" rx="3" fill="hsl(var(--primary))" opacity="0.3" className="animate-[barGrow1_2s_ease-out_infinite]" style={{transformOrigin: '35px 94px'}} />
                <rect x="48" y="45" width="14" height="49" rx="3" fill="hsl(var(--primary))" opacity="0.5" className="animate-[barGrow2_2s_ease-out_0.2s_infinite]" style={{transformOrigin: '55px 94px'}} />
                <rect x="68" y="30" width="14" height="64" rx="3" fill="hsl(var(--primary))" opacity="0.7" className="animate-[barGrow3_2s_ease-out_0.4s_infinite]" style={{transformOrigin: '75px 94px'}} />
                <rect x="88" y="55" width="14" height="39" rx="3" fill="hsl(var(--primary))" opacity="0.4" className="animate-[barGrow1_2s_ease-out_0.6s_infinite]" style={{transformOrigin: '95px 94px'}} />
                <path d="M32 68 L55 42 L75 28 L95 52" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-[lineTrace_2s_ease-out_0.5s_infinite]" strokeDasharray="120" strokeDashoffset="120" />
                <circle cx="95" cy="25" r="2" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_infinite]" />
                <circle cx="22" cy="45" r="1.5" fill="#facc15" className="animate-[sparkle_2s_ease-in-out_0.7s_infinite]" />
                <defs>
                  <radialGradient id="chartGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p className="font-semibold text-foreground">Nenhum dado disponível.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Os itens mais vendidos aparecerão aqui conforme os pedidos forem finalizados.
          </p>
          <style>{`
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            @keyframes barGrow1 { 0% { transform: scaleY(0); } 40%, 100% { transform: scaleY(1); } }
            @keyframes barGrow2 { 0% { transform: scaleY(0); } 40%, 100% { transform: scaleY(1); } }
            @keyframes barGrow3 { 0% { transform: scaleY(0); } 40%, 100% { transform: scaleY(1); } }
            @keyframes lineTrace { 0% { stroke-dashoffset: 120; } 50%, 100% { stroke-dashoffset: 0; } }
            @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.3); } }
          `}</style>
        </div>
      ) : (
        <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-slide-up">
          <div className="grid grid-cols-[32px_1fr_72px_80px] gap-x-3 px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b border-border/50 bg-muted/30">
            <span>#</span>
            <span>Item</span>
            <span className="text-right">Qtd.</span>
            <span className="text-right">Receita</span>
          </div>
          <div className="divide-y divide-border">
            {ranked.map((item, idx) => {
              const pct = Math.round((item.qty / maxQty) * 100);
              const revPct = totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : "0";
              return (
                <div key={item.name} className="px-4 py-3 space-y-1.5">
                  <div className="grid grid-cols-[32px_1fr_72px_80px] gap-x-3 items-center">
                    <span
                      className={`font-bold text-sm ${
                        idx === 0
                          ? "text-yellow-500"
                          : idx === 1
                          ? "text-slate-400"
                          : idx === 2
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}°`}
                    </span>
                    <div>
                      <p className="font-medium text-foreground text-sm leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{revPct}% da receita</p>
                    </div>
                    <span className="text-right font-bold text-foreground text-sm">
                      {item.qty}×
                    </span>
                    <span className="text-right text-sm text-muted-foreground">
                      {fmtBRL(item.revenue)}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
