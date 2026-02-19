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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
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
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Itens únicos</p>
            <p className="font-bold text-foreground text-2xl">{ranked.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Receita total</p>
            <p className="font-bold text-foreground text-2xl">{fmtBRL(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Ranked list */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando dados…</p>
      ) : ranked.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold text-foreground">Nenhum dado disponível.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Os itens mais vendidos aparecerão aqui conforme os pedidos forem finalizados.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[32px_1fr_72px_80px] gap-x-3 px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b border-border bg-secondary/40">
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
