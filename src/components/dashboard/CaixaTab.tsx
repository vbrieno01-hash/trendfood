import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Lock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useActiveCashSession,
  useCashWithdrawals,
  useCashHistory,
  useOpenCashSession,
  useCloseCashSession,
  useAddWithdrawal,
  type CashSession,
} from "@/hooks/useCashSession";
import { useDeliveredOrders } from "@/hooks/useOrders";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yy HH:mm", { locale: ptBR });

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        highlight
          ? "border-green-500/30 bg-green-500/10"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-green-500" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Closed State ─────────────────────────────────────────────────────────────

function CaixaFechado({
  orgId,
  history,
  historyLoading,
}: {
  orgId: string;
  history: CashSession[];
  historyLoading: boolean;
}) {
  const [opening, setOpening] = useState("");
  const openSession = useOpenCashSession(orgId);

  const handleOpen = () => {
    const val = parseFloat(opening.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    openSession.mutate(val);
  };

  return (
    <div className="space-y-8">
      {/* Open card */}
      <div className="max-w-sm mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Wallet className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xl">Caixa Fechado</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Informe o saldo inicial para começar o turno
            </p>
          </div>
          <div className="space-y-2 text-left">
            <Label htmlFor="opening_balance">Saldo inicial (R$)</Label>
            <Input
              id="opening_balance"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleOpen}
            disabled={openSession.isPending || opening === ""}
          >
            {openSession.isPending ? "Abrindo..." : "Abrir Caixa"}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-base">Últimos turnos</h3>
        {historyLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            Nenhum turno encerrado ainda
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((s) => {
                  const diff = (s.closing_balance ?? 0) - s.opening_balance;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{fmtDate(s.opened_at)}</TableCell>
                      <TableCell className="text-sm">{s.closed_at ? fmtDate(s.closed_at) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(s.opening_balance)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {s.closing_balance != null ? fmt(s.closing_balance) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm font-medium ${
                          diff >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {diff >= 0 ? "+" : ""}{fmt(diff)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Active State ─────────────────────────────────────────────────────────────

function CaixaAberto({ session, orgId }: { session: CashSession; orgId: string }) {
  const { data: withdrawals = [] } = useCashWithdrawals(session.id);
  const { data: allDelivered = [] } = useDeliveredOrders(orgId);

  // Filter paid orders created on or after session opened_at
  const sessionOpenedAt = new Date(session.opened_at);
  const paidOrders = allDelivered.filter(
    (o) => o.paid && new Date(o.created_at) >= sessionOpenedAt
  );

  // Revenue: sum of order_items price * qty for paid orders in this session
  const revenue = paidOrders.reduce((sum, o) => {
    const items = o.order_items ?? [];
    return sum + items.reduce((s, i) => s + i.price * i.quantity, 0);
  }, 0);

  const totalWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0);
  const projected = session.opening_balance + revenue - totalWithdrawals;

  // Modal state
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const addWithdrawal = useAddWithdrawal(orgId, session.id);
  const closeSession = useCloseCashSession(orgId);

  const [wAmount, setWAmount] = useState("");
  const [wReason, setWReason] = useState("");
  const [closingBal, setClosingBal] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const handleWithdrawal = () => {
    const val = parseFloat(wAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    addWithdrawal.mutate(
      { amount: val, reason: wReason || undefined },
      {
        onSuccess: () => {
          setWithdrawalOpen(false);
          setWAmount("");
          setWReason("");
        },
      }
    );
  };

  const handleClose = () => {
    const val = parseFloat(closingBal.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    closeSession.mutate(
      { sessionId: session.id, closingBalance: val, notes: closeNotes || undefined },
      { onSuccess: () => setCloseOpen(false) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Turno ativo desde {fmtDate(session.opened_at)}
          </p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{fmt(projected)}</p>
          <p className="text-muted-foreground text-xs mt-0.5">Saldo projetado no caixa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setWithdrawalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Sangria
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCloseOpen(true)}
          >
            <Lock className="w-4 h-4 mr-1" />
            Fechar Caixa
          </Button>
        </div>
      </div>

      {/* Metrics 2×2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Saldo inicial" value={fmt(session.opening_balance)} icon={Wallet} />
        <MetricCard label="Receita do turno" value={fmt(revenue)} icon={TrendingUp} />
        <MetricCard label="Total de sangrias" value={fmt(totalWithdrawals)} icon={TrendingDown} />
        <MetricCard label="Saldo projetado" value={fmt(projected)} icon={DollarSign} highlight />
      </div>

      {/* Withdrawals list */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground text-base">Sangrias do turno</h3>
        {withdrawals.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center text-muted-foreground text-sm">
            Nenhuma sangria registrada neste turno
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{fmtDate(w.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.reason || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-destructive">
                      -{fmt(w.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Withdrawal modal */}
      <Dialog open={withdrawalOpen} onOpenChange={setWithdrawalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Sangria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={wAmount}
                onChange={(e) => setWAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Input
                placeholder="Ex: Troco para caixa menor"
                value={wReason}
                onChange={(e) => setWReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawalOpen(false)}>Cancelar</Button>
            <Button onClick={handleWithdrawal} disabled={addWithdrawal.isPending || !wAmount}>
              {addWithdrawal.isPending ? "Salvando..." : "Confirmar Sangria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close modal */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Fechar Caixa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo inicial</span>
                <span className="font-medium">{fmt(session.opening_balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receita do turno</span>
                <span className="font-medium text-green-500">+{fmt(revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de sangrias</span>
                <span className="font-medium text-destructive">-{fmt(totalWithdrawals)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold">Saldo projetado</span>
                <span className="font-bold">{fmt(projected)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Saldo final contado (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={closingBal}
                onChange={(e) => setClosingBal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Alguma observação sobre o turno..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={closeSession.isPending || closingBal === ""}
            >
              {closeSession.isPending ? "Fechando..." : "Confirmar Fechamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CaixaTab({ orgId }: { orgId: string }) {
  const { data: session, isLoading: sessionLoading } = useActiveCashSession(orgId);
  const { data: history = [], isLoading: historyLoading } = useCashHistory(orgId);

  if (sessionLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full max-w-sm mx-auto" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Controle de Caixa</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gerencie turnos, sangrias e saldo do caixa
        </p>
      </div>

      {session ? (
        <CaixaAberto session={session} orgId={orgId} />
      ) : (
        <CaixaFechado orgId={orgId} history={history} historyLoading={historyLoading} />
      )}
    </div>
  );
}
