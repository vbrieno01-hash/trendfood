import { useState } from "react";
import { History, Search, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOrderHistory } from "@/hooks/useOrders";

interface HistoryTabProps {
  orgId: string;
  restrictTo7Days?: boolean;
}

type Period = "today" | "7d" | "30d" | "all";
type PaidFilter = "all" | "paid" | "unpaid";
type TypeFilter = "all" | "store" | "delivery";

const allPeriodOptions: { key: Period; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
];

const paidOptions: { key: PaidFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "paid", label: "Pagos" },
  { key: "unpaid", label: "Não pagos" },
];

const typeOptions: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "store", label: "Loja" },
  { key: "delivery", label: "Entregas" },
];

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function HistoryTab({ orgId, restrictTo7Days }: HistoryTabProps) {
  const periodOptions = restrictTo7Days
    ? allPeriodOptions.filter((o) => o.key === "today" || o.key === "7d")
    : allPeriodOptions;
  const [period, setPeriod] = useState<Period>("7d");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useOrderHistory(orgId, period);

  const filtered = orders.filter((order) => {
    if (typeFilter === "store" && order.table_number === 0) return false;
    if (typeFilter === "delivery" && order.table_number !== 0) return false;
    if (paidFilter === "paid" && !order.paid) return false;
    if (paidFilter === "unpaid" && order.paid) return false;
    if (search.trim()) {
      const q = search.trim();
      const matchTable = String(order.table_number).includes(q);
      if (!matchTable) return false;
    }
    return true;
  });

  const totalRevenue = filtered.reduce((sum, order) => {
    return sum + (order.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
  }, 0);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground text-xl">Histórico de Pedidos</h2>
      </div>

      {restrictTo7Days && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
          📊 No plano Grátis, o histórico é limitado aos últimos 7 dias.{" "}
          <a href="/planos" className="text-primary font-medium hover:underline">Fazer upgrade</a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Period */}
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

        {/* Paid filter */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {paidOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPaidFilter(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                paidFilter === opt.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {typeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTypeFilter(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                typeFilter === opt.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Buscar por mesa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="font-bold text-foreground text-2xl">{filtered.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="font-bold text-foreground text-2xl">{fmtBRL(totalRevenue)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">🍽️ Loja</p>
            <p className="font-bold text-foreground text-2xl">{filtered.filter(o => o.table_number > 0).length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">🛵 Entregas</p>
            <p className="font-bold text-foreground text-2xl">{filtered.filter(o => o.table_number === 0).length}</p>
          </div>
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando histórico…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-foreground">Nenhum pedido encontrado.</p>
          <p className="text-muted-foreground text-sm mt-1">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const total = (order.order_items ?? []).reduce(
              (s, i) => s + i.price * i.quantity,
              0
            );
            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-foreground">
                        {order.table_number === 0 ? "🛵 Entrega" : `Mesa ${order.table_number}`}
                      </span>
                    </div>
                    {order.paid ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">
                        ✓ Pago
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-xs">
                        Não pago
                      </Badge>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">{fmtBRL(total)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(order.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(order.order_items ?? []).map((item) => (
                    <span
                      key={item.id}
                      className="text-xs bg-secondary text-secondary-foreground rounded px-2 py-0.5"
                    >
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                </div>
                {order.notes && (
                  <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
                    📝 {order.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
