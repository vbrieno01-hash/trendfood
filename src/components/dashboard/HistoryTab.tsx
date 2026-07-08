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
import { CommandHeader, CommandPanel, MetricTile, StatusPill, CommandEmpty } from "@/components/dashboard/command";

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
  { label: "Mais de 24 horas", daysAgo: 1, description: "pedidos finalizados (entregues e cancelados) com mais de 24 horas" },
  { label: "Mais de 7 dias", daysAgo: 7, description: "pedidos finalizados (entregues e cancelados) com mais de 7 dias" },
  { label: "Mais de 30 dias", daysAgo: 30, description: "pedidos finalizados (entregues e cancelados) com mais de 30 dias" },
  { label: "Limpar Tudo", daysAgo: null, description: "todos os pedidos finalizados (entregues e cancelados) do histórico" },
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
    <div className="space-y-5">
      <CommandHeader
        eyebrow="Registro / Histórico"
        title="Histórico de Pedidos"
        subtitle={`${filtered.length} pedidos no filtro atual`}
        icon={<History className="w-5 h-5" />}
        actions={<>
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
        </>}
      />

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
        <div className="cmd-panel cmd-panel--accent px-4 py-2.5 text-sm text-muted-foreground">
          📊 No plano Grátis, o histórico é limitado aos últimos 7 dias.{" "}
          <a href="/planos" className="text-primary font-medium hover:underline">Fazer upgrade</a>
        </div>
      )}

      {/* Filters */}
      <CommandPanel eyebrow="Filtros" padding="md">
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
      </CommandPanel>

      {/* Summary */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricTile label="Pedidos" value={filtered.length} />
          <MetricTile label="Receita" value={fmtBRL(totalRevenue)} />
          <MetricTile label="Loja" value={filtered.filter(o => o.table_number !== 0).length} sub="mesas + balcão" />
          <MetricTile label="Entregas" value={filtered.filter(o => o.table_number === 0).length} sub="delivery" />
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <p className="text-muted-foreground animate-pulse py-8 text-center">Carregando histórico…</p>
      ) : filtered.length === 0 ? (
        <CommandEmpty
          icon={<Receipt className="w-7 h-7" />}
          title="Nenhum pedido encontrado"
          description="Tente ajustar os filtros de período, pagamento ou tipo."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const total = orderTotal(order);
            return (
              <div
                key={order.id}
                className="cmd-panel p-4 space-y-2 dashboard-table-row"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <span className="font-display font-bold text-foreground">
                        {(order as any).order_number ? `#${(order as any).order_number} — ` : ""}
                        {order.table_number === -1 ? "🛒 Balcão" : order.table_number === 0 ? "🛵 Entrega" : `Mesa ${order.table_number}`}
                      </span>
                    </div>
                    {order.paid ? (
                      <StatusPill variant="live" dot>Pago</StatusPill>
                    ) : (
                      <StatusPill variant="warn" dot>Não pago</StatusPill>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-display font-bold text-foreground kpi-number text-lg">{fmtBRL(total)}</p>
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
                {fiscalEnabled && (
                  <div className="pt-1">
                    <OrderFiscalActions
                      orgId={orgId}
                      orderId={order.id}
                      invoice={invoicesByOrder.get(order.id) ?? null}
                      customerEmail={(order as any).customer_email ?? null}
                      compact
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
