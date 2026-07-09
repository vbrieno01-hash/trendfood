import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Wallet, Lock, AlertCircle, Banknote, QrCode, CreditCard, HelpCircle, ArrowDownCircle, ArrowUpCircle, User, Printer, Download, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useOperatorNames,
  type CashSession,
} from "@/hooks/useCashSession";
import { useDeliveredOrders } from "@/hooks/useOrders";
import { CommandHeader, CommandPanel, MetricTile, StatusPill } from "@/components/dashboard/command";
import { supabase } from "@/integrations/supabase/client";
import { enqueuePrint } from "@/lib/printQueue";
import { buildCashReceipt } from "@/lib/cashReceipt";

// Limite acima do qual uma divergência exige justificativa obrigatória
const DIVERGENCE_THRESHOLD = 5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yy HH:mm", { locale: ptBR });

type PaymentBucket = "dinheiro" | "pix" | "cartao" | "outros";

// Normaliza qualquer valor de payment_method nos 4 baldes utilizados pelo caixa.
// Só o balde "dinheiro" impacta o saldo físico projetado.
function normalizePaymentMethod(raw: string | null | undefined): PaymentBucket {
  if (!raw) return "outros";
  const v = raw.toString().trim().toLowerCase();
  if (v === "dinheiro" || v === "cash" || v === "money") return "dinheiro";
  if (v === "pix") return "pix";
  if (
    v.includes("card") ||
    v.includes("cartão") ||
    v.includes("cartao") ||
    v.includes("maquin") ||
    v.includes("débito") ||
    v.includes("debito") ||
    v.includes("crédito") ||
    v.includes("credito")
  ) {
    return "cartao";
  }
  return "outros";
}

const CATEGORY_OPTIONS = [
  { value: "troco", label: "Troco" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "retirada", label: "Retirada do sócio" },
  { value: "despesa", label: "Despesa" },
  { value: "outro", label: "Outro" },
];

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
    <MetricTile
      label={label}
      value={value}
      icon={<Icon className="w-4 h-4" />}
      className={highlight ? "border-primary/40" : ""}
    />
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
        <CommandPanel padding="lg" className="text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto text-white">
            <Wallet className="w-7 h-7" />
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
        </CommandPanel>
      </div>

      {/* History */}
      <CommandPanel eyebrow="Histórico" title="Últimos turnos" padding="none">
        {historyLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Nenhum turno encerrado ainda</div>
        ) : (
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
        )}
      </CommandPanel>
    </div>
  );
}

// ─── Active State ─────────────────────────────────────────────────────────────

function CaixaAberto({ session, orgId }: { session: CashSession; orgId: string }) {
  const { data: withdrawals = [] } = useCashWithdrawals(session.id);
  const { data: allDelivered = [] } = useDeliveredOrders(orgId);
  const { data: operatorNames = {} } = useOperatorNames([session.opened_by]);
  const openedByName = session.opened_by ? (operatorNames[session.opened_by] || "Operador") : "—";

  // Filter paid orders created on or after session opened_at
  const sessionOpenedAt = new Date(session.opened_at);
  const paidOrders = allDelivered.filter(
    (o) => o.paid && new Date(o.created_at) >= sessionOpenedAt
  );

  // Receita por forma de pagamento (só "dinheiro" impacta o caixa físico)
  const revenueByMethod: Record<PaymentBucket, number> = {
    dinheiro: 0,
    pix: 0,
    cartao: 0,
    outros: 0,
  };
  for (const o of paidOrders) {
    const bucket = normalizePaymentMethod((o as { payment_method?: string | null }).payment_method);
    const total = (o.order_items ?? []).reduce((s, i) => s + i.price * i.quantity, 0);
    revenueByMethod[bucket] += total;
  }
  const revenueTotal =
    revenueByMethod.dinheiro + revenueByMethod.pix + revenueByMethod.cartao + revenueByMethod.outros;

  // Sangrias (saídas) e suprimentos (entradas)
  const totalSangrias = withdrawals
    .filter((w) => w.movement_type !== "suprimento")
    .reduce((s, w) => s + w.amount, 0);
  const totalSuprimentos = withdrawals
    .filter((w) => w.movement_type === "suprimento")
    .reduce((s, w) => s + w.amount, 0);

  // Saldo físico projetado = só considera o que entra/sai do caixa em espécie
  const projected =
    session.opening_balance + revenueByMethod.dinheiro + totalSuprimentos - totalSangrias;

  // Modal state
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"sangria" | "suprimento">("sangria");
  const [closeOpen, setCloseOpen] = useState(false);

  const addWithdrawal = useAddWithdrawal(orgId, session.id);
  const closeSession = useCloseCashSession(orgId);

  const [mAmount, setMAmount] = useState("");
  const [mReason, setMReason] = useState("");
  const [mCategory, setMCategory] = useState<string>("outro");
  const [closingBal, setClosingBal] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [divReason, setDivReason] = useState("");
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Cálculo em tempo real da divergência dentro do modal de fechamento
  const countedValue = parseFloat(closingBal.replace(",", ".")) || 0;
  const divergence = countedValue - projected;
  const divergenceAbs = Math.abs(divergence);
  const divergenceCritical = closingBal !== "" && divergenceAbs > DIVERGENCE_THRESHOLD;
  const canConfirmClose =
    closingBal !== "" && !closeSession.isPending && (!divergenceCritical || divReason.trim().length >= 3);

  const openMovementModal = (type: "sangria" | "suprimento") => {
    setMovementType(type);
    setMAmount("");
    setMReason("");
    setMCategory(type === "suprimento" ? "troco" : "outro");
    setMovementOpen(true);
  };

  const handleSaveMovement = () => {
    const val = parseFloat(mAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    addWithdrawal.mutate(
      {
        amount: val,
        reason: mReason || undefined,
        movement_type: movementType,
        category: mCategory || undefined,
      },
      {
        onSuccess: () => {
          setMovementOpen(false);
          setMAmount("");
          setMReason("");
        },
      }
    );
  };

  const handleClose = () => {
    const val = parseFloat(closingBal.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    const diff = val - projected;
    const isCritical = Math.abs(diff) > DIVERGENCE_THRESHOLD;
    const combinedNotes = isCritical
      ? `[DIVERGÊNCIA ${diff >= 0 ? "SOBRA" : "FALTA"} ${fmt(Math.abs(diff))}] ${divReason.trim()}${closeNotes ? " | " + closeNotes : ""}`
      : (closeNotes || undefined);
    closeSession.mutate(
      {
        sessionId: session.id,
        closingBalance: val,
        notes: combinedNotes || undefined,
        divergenceReason: isCritical ? divReason.trim() : undefined,
      },
      {
        onSuccess: async (updated) => {
          setCloseOpen(false);
          // Montar e imprimir cupom Z
          try {
            const { data: orgRow } = await supabase
              .from("organizations")
              .select("nome_loja, name")
              .eq("id", orgId)
              .maybeSingle();
            const storeName =
              (orgRow as { nome_loja?: string; name?: string } | null)?.nome_loja ||
              (orgRow as { nome_loja?: string; name?: string } | null)?.name ||
              "TrendFood";
            const text = buildCashReceipt({
              storeName,
              openedAt: session.opened_at,
              closedAt: updated.closed_at || new Date().toISOString(),
              openedByName,
              closedByName: "Operador atual",
              openingBalance: session.opening_balance,
              revenueByMethod,
              totalSuprimentos,
              totalSangrias,
              expected: projected,
              counted: val,
              divergence: diff,
              divergenceReason: isCritical ? divReason.trim() : null,
              movements: withdrawals.map((w) => ({
                time: fmtDate(w.created_at),
                type: w.movement_type,
                category: w.category,
                reason: w.reason,
                amount: w.amount,
              })),
              orderCount: paidOrders.length,
            });
            setReceiptText(text);
            setReceiptOpen(true);
            // Envia pra fila de impressão (idempotente; falha silenciosa se impressora não tiver)
            try {
              await enqueuePrint(orgId, null, text);
              toast.success("Cupom Z enviado pra impressora");
            } catch (err) {
              console.warn("[CaixaTab] Falha ao enfileirar cupom Z:", err);
              toast.info("Cupom Z gerado — impressora não conectada");
            }
          } catch (err) {
            console.error("[CaixaTab] Erro ao gerar cupom Z:", err);
          }
        },
      }
    );
  };

  const handleReprint = async () => {
    if (!receiptText) return;
    try {
      await enqueuePrint(orgId, null, receiptText);
      toast.success("Cupom enviado pra impressora novamente");
    } catch (err) {
      console.error("[CaixaTab] Falha ao reimprimir cupom:", err);
      toast.error("Não foi possível enviar pra impressora");
    }
  };

  return (
    <div className="space-y-6">
      <CommandPanel
        variant="accent"
        eyebrow="Turno em andamento"
        title={fmt(projected)}
        description={`Dinheiro em caixa (projetado) · aberto em ${fmtDate(session.opened_at)} por ${openedByName}`}
        actions={
          <>
            <StatusPill variant="live" dot>Aberto</StatusPill>
            <Button variant="outline" size="sm" onClick={() => openMovementModal("suprimento")}>
              <ArrowUpCircle className="w-4 h-4 mr-1" />
              Suprimento
            </Button>
            <Button variant="outline" size="sm" onClick={() => openMovementModal("sangria")}>
              <ArrowDownCircle className="w-4 h-4 mr-1" />
              Sangria
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setCloseOpen(true)}>
              <Lock className="w-4 h-4 mr-1" />
              Fechar Caixa
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted-foreground">
          Só o dinheiro em espécie entra no saldo físico. PIX e cartão são mostrados só como referência.
        </p>
      </CommandPanel>

      {/* Métricas do saldo físico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Saldo inicial" value={fmt(session.opening_balance)} icon={Wallet} />
        <MetricCard label="Receita em dinheiro" value={fmt(revenueByMethod.dinheiro)} icon={Banknote} />
        <MetricCard label="Suprimentos" value={fmt(totalSuprimentos)} icon={ArrowUpCircle} />
        <MetricCard label="Sangrias" value={fmt(totalSangrias)} icon={ArrowDownCircle} />
      </div>

      {/* Receita total por forma de pagamento (referência) */}
      <CommandPanel eyebrow="Receita do turno" title={`Total: ${fmt(revenueTotal)}`} padding="lg">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Dinheiro" value={fmt(revenueByMethod.dinheiro)} icon={Banknote} highlight />
          <MetricCard label="PIX" value={fmt(revenueByMethod.pix)} icon={QrCode} />
          <MetricCard label="Cartão" value={fmt(revenueByMethod.cartao)} icon={CreditCard} />
          <MetricCard label="Outros" value={fmt(revenueByMethod.outros)} icon={HelpCircle} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Apenas a receita em <strong>Dinheiro</strong> impacta o saldo físico do caixa. Os demais são referência contábil.
        </p>
      </CommandPanel>

      <CommandPanel eyebrow="Movimentações" title="Sangrias e suprimentos do turno" padding="none">
        {withdrawals.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground text-sm">Nenhuma movimentação registrada neste turno</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Horário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => {
                const isSup = w.movement_type === "suprimento";
                return (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{fmtDate(w.created_at)}</TableCell>
                    <TableCell className="text-sm">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isSup ? "text-green-500" : "text-destructive"}`}>
                        {isSup ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                        {isSup ? "Suprimento" : "Sangria"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{w.category || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.reason || "—"}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${isSup ? "text-green-500" : "text-destructive"}`}>
                      {isSup ? "+" : "-"}{fmt(w.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CommandPanel>

      {/* Modal de movimentação (sangria ou suprimento) */}
      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === "suprimento" ? (
                <ArrowUpCircle className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowDownCircle className="w-5 h-5 text-destructive" />
              )}
              {movementType === "suprimento" ? "Registrar Suprimento" : "Registrar Sangria"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {movementType === "suprimento"
                ? "Entrada de dinheiro no caixa (ex: reforço de troco)."
                : "Saída de dinheiro do caixa (ex: pagamento a fornecedor)."}
            </p>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={mAmount}
                onChange={(e) => setMAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={mCategory} onValueChange={setMCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Observação (opcional)</Label>
              <Input
                placeholder={movementType === "suprimento" ? "Ex: Reforço de troco" : "Ex: Pagamento fornecedor X"}
                value={mReason}
                onChange={(e) => setMReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMovement} disabled={addWithdrawal.isPending || !mAmount}>
              {addWithdrawal.isPending ? "Salvando..." : "Confirmar"}
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
                <span className="text-muted-foreground">Receita em dinheiro</span>
                <span className="font-medium text-green-500">+{fmt(revenueByMethod.dinheiro)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suprimentos</span>
                <span className="font-medium text-green-500">+{fmt(totalSuprimentos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sangrias</span>
                <span className="font-medium text-destructive">-{fmt(totalSangrias)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold">Dinheiro esperado em caixa</span>
                <span className="font-bold">{fmt(projected)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Receita não-dinheiro (PIX/Cartão): {fmt(revenueByMethod.pix + revenueByMethod.cartao + revenueByMethod.outros)} — não entra no caixa físico.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Dinheiro contado na gaveta (R$)</Label>
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
      <CommandHeader
        eyebrow="Financeiro"
        title="Controle de Caixa"
        subtitle="Gerencie turnos, sangrias e saldo do caixa."
        icon={<Wallet className="w-5 h-5" />}
        actions={
          session ? <StatusPill variant="live" dot>Turno aberto</StatusPill> : <StatusPill variant="neutral">Fechado</StatusPill>
        }
      />

      {session ? (
        <CaixaAberto session={session} orgId={orgId} />
      ) : (
        <CaixaFechado orgId={orgId} history={history} historyLoading={historyLoading} />
      )}
    </div>
  );
}
