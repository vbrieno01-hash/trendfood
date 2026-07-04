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
import OrderFiscalActions from "@/components/dashboard/OrderFiscalActions";
import { useFiscalInvoices, useFiscalInvoicesRealtime, useFiscalStatus } from "@/hooks/useFiscalInvoices";

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
  useFiscalInvoicesRealtime(orgId);
  const { data: fiscalCfg } = useFiscalStatus(orgId);
  const { data: fiscalInvoices = [] } = useFiscalInvoices(orgId, { since: (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString(); })() });
  const invoicesByOrder = new Map(fiscalInvoices.map(i => [i.order_id, i]));
  const fiscalEnabled = !!fiscalCfg?.enabled;
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
    // Note: balcão (table_number === -1) counts as "store" for filtering
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
          <h2 className="font-bold text-foreground text-xl">Histórico de Pedidos</h2>
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
                const PAYMENT_LABELS: Record<string, string> = {
                  pix: "PIX",
                  cash: "Dinheiro",
                  card_debit: "Débito",
                  card_credit: "Crédito",
                  card: "Cartão",
                  pending: "Não informado",
                };
                const labelPayment = (pm?: string | null) => {
                  if (!pm) return "Não informado";
                  return PAYMENT_LABELS[pm.toLowerCase().trim()] ?? pm;
                };
                const header = "Data,Mesa/Tipo,Itens,Valor,Forma de Pagamento,Status Pagamento,Observações";
                const rows = filtered.map((order) => {
                  const total = orderTotal(order);
                  const items = (order.order_items ?? []).map((i) => `${i.quantity}x ${i.name}`).join("; ");
                  const mesa = order.table_number === -1 ? "Balcão" : order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
                  const pago = order.paid ? "Pago" : "Não pago";
                  const date = new Date(order.created_at).toLocaleString("pt-BR");
                  const obs = (order.notes || "").replace(/,/g, ";").replace(/\n/g, " ");
                  const forma = labelPayment((order as any).payment_method);
                  return `"${date}","${mesa}","${items}","${total.toFixed(2)}","${forma}","${pago}","${obs}"`;
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
            <p className="font-bold text-foreground text-2xl">{filtered.filter(o => o.table_number !== 0).length}</p>
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
          <div className="relative mx-auto w-24 h-24 mb-3">
            <div className="animate-[float_3s_ease-in-out_infinite]">
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-24 h-24">
                <circle cx="60" cy="60" r="50" fill="url(#clipGlow)" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <rect x="36" y="20" width="48" height="70" rx="6" fill="hsl(var(--primary))" opacity="0.15" />
                <rect x="40" y="24" width="40" height="62" rx="4" fill="hsl(var(--primary))" opacity="0.25" />
                <rect x="46" y="14" width="28" height="14" rx="4" fill="hsl(var(--primary))" opacity="0.6" />
                <line x1="48" y1="42" x2="72" y2="42" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                <line x1="48" y1="52" x2="68" y2="52" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                <line x1="48" y1="62" x2="64" y2="62" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
                <g className="animate-[scanMove_3s_ease-in-out_infinite]">
                  <circle cx="82" cy="82" r="14" stroke="hsl(var(--primary))" strokeWidth="3" fill="hsl(var(--primary))" fillOpacity="0.1" />
                  <line x1="92" y1="92" x2="102" y2="102" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" />
                </g>
                <defs>
                  <radialGradient id="clipGlow" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
          <p className="font-semibold text-foreground">Nenhum pedido encontrado.</p>
          <p className="text-muted-foreground text-sm mt-1">Tente ajustar os filtros.</p>
          <style>{`
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
            @keyframes scanMove { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-4px, -4px); } }
          `}</style>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const total = orderTotal(order);
            return (
              <div
                key={order.id}
                className="dashboard-glass rounded-xl p-4 space-y-2 dashboard-table-row"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-foreground">
                        {(order as any).order_number ? `#${(order as any).order_number} — ` : ""}
                        {order.table_number === -1 ? "🛒 Balcão" : order.table_number === 0 ? "🛵 Entrega" : `Mesa ${order.table_number}`}
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
