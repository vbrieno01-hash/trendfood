import { useState } from "react";
import { History, Search, Receipt, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrderHistory, useDeleteOrder, useDeleteOldOrders } from "@/hooks/useOrders";
import { extractDeliveryFee } from "@/lib/formatReceiptText";
import { useAuth } from "@/hooks/useAuth";

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

const cleanupOptions: { label: string; daysAgo: number | null; description: string }[] = [
  { label: "Mais de 24 horas", daysAgo: 1, description: "pedidos entregues com mais de 24 horas" },
  { label: "Mais de 7 dias", daysAgo: 7, description: "pedidos entregues com mais de 7 dias" },
  { label: "Mais de 30 dias", daysAgo: 30, description: "pedidos entregues com mais de 30 dias" },
  { label: "Limpar Tudo", daysAgo: null, description: "todos os pedidos entregues do histórico" },
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
  const { user, organization, isAdmin } = useAuth();
  const isOwner = !!user && !!organization && organization.user_id === user.id;
  const canDelete = isOwner || isAdmin;

  const periodOptions = restrictTo7Days
    ? allPeriodOptions.filter((o) => o.key === "today" || o.key === "7d")
    : allPeriodOptions;
  const [period, setPeriod] = useState<Period>("7d");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [cleanupConfirm, setCleanupConfirm] = useState<typeof cleanupOptions[0] | null>(null);

  const { data: orders = [], isLoading } = useOrderHistory(orgId, period);
  const deleteOrder = useDeleteOrder(orgId);
  const deleteOldOrders = useDeleteOldOrders(orgId);

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

  const orderTotal = (o: any) =>
    (o.order_items ?? []).reduce((s: number, i: any) => s + i.price * i.quantity, 0) + extractDeliveryFee(o.notes);

  const totalRevenue = filtered.reduce((sum, order) => sum + orderTotal(order), 0);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 animate-dashboard-fade-in">
        <div className="flex items-center gap-3">
          <div className="dashboard-section-icon">
            <History className="w-5 h-5" />
          </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                  Limpar Histórico
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cleanupOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.label}
                    onClick={() => setCleanupConfirm(opt)}
                    className={opt.daysAgo === null ? "text-destructive font-medium" : ""}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const header = "Data,Mesa/Tipo,Itens,Valor,Status Pagamento,Observações";
                const rows = filtered.map((order) => {
                  const total = orderTotal(order);
                  const items = (order.order_items ?? []).map((i) => `${i.quantity}x ${i.name}`).join("; ");
                  const mesa = order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
                  const pago = order.paid ? "Pago" : "Não pago";
                  const date = new Date(order.created_at).toLocaleString("pt-BR");
                  const obs = (order.notes || "").replace(/,/g, ";").replace(/\n/g, " ");
                  return `"${date}","${mesa}","${items}","${total.toFixed(2)}","${pago}","${obs}"`;
                });
                const csv = [header, ...rows].join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Cleanup confirmation dialog */}
      <AlertDialog open={!!cleanupConfirm} onOpenChange={(open) => !open && setCleanupConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação excluirá permanentemente {cleanupConfirm?.description}. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cleanupConfirm) deleteOldOrders.mutate(cleanupConfirm.daysAgo);
                setCleanupConfirm(null);
              }}
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {restrictTo7Days && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-muted-foreground">
          📊 No plano Grátis, o histórico é limitado aos últimos 7 dias.{" "}
          <a href="/planos" className="text-primary font-medium hover:underline">Fazer upgrade</a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-1">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="font-bold text-foreground text-2xl">{filtered.length}</p>
          </div>
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-2">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="font-bold text-foreground text-2xl">{fmtBRL(totalRevenue)}</p>
          </div>
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-3">
            <p className="text-xs text-muted-foreground">🍽️ Loja</p>
            <p className="font-bold text-foreground text-2xl">{filtered.filter(o => o.table_number > 0).length}</p>
          </div>
          <div className="dashboard-glass rounded-2xl px-4 py-3 animate-dashboard-fade-in dash-delay-4">
            <p className="text-xs text-muted-foreground">🛵 Entregas</p>
            <p className="font-bold text-foreground text-2xl">{filtered.filter(o => o.table_number === 0).length}</p>
          </div>
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando histórico…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 dashboard-glass rounded-2xl">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-foreground">Nenhum pedido encontrado.</p>
          <p className="text-muted-foreground text-sm mt-1">Tente ajustar os filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const total = orderTotal(order);
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
                        {(order as any).order_number ? `#${(order as any).order_number} — ` : ""}
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-foreground">{fmtBRL(total)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(order.created_at)}</p>
                    </div>
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Excluir registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir permanentemente este registro do histórico? Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteOrder.mutate(order.id)}
                            >
                              Sim, excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
