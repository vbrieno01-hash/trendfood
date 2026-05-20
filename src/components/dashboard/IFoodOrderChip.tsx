import { useState } from "react";
import { Copy, Utensils, AlertTriangle, Check, X, Loader2, Ban, ClipboardList, KeyRound, Bike, Edit3, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MERCHANT_CANCEL_REASONS: Array<{ code: string; label: string }> = [
  { code: "501", label: "Problemas de sistema" },
  { code: "502", label: "Pedido em duplicidade" },
  { code: "503", label: "Item indisponível" },
  { code: "504", label: "Sem entregador disponível" },
  { code: "505", label: "Cardápio desatualizado" },
  { code: "506", label: "Pedido fora da área de entrega" },
  { code: "508", label: "Restaurante fechado" },
  { code: "509", label: "Outros motivos" },
];

interface Props {
  gatewayPaymentId?: string | null;
  notes?: string | null;
  status?: string | null;
  ifoodDispatchedAt?: string | null;
  ifoodConcludedAt?: string | null;
  ifoodCancellationRequestedAt?: string | null;
  ifoodOrderType?: string | null;
  orderId?: string;
  organizationId?: string;
  ifoodPatchedAt?: string | null;
  ifoodDriverName?: string | null;
  ifoodDriverAssignedAt?: string | null;
  ifoodScheduledFor?: string | null;
}

function parseDisplayId(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/IFOOD_DISPLAY:([^|]+)/);
  return m ? m[1].trim() || null : null;
}

export function parseIFoodOrderId(gatewayPaymentId?: string | null): string | null {
  if (!gatewayPaymentId || !gatewayPaymentId.startsWith("ifood:")) return null;
  return gatewayPaymentId.slice("ifood:".length) || null;
}

function statusLabel(
  status?: string | null,
  dispatched?: string | null,
  concluded?: string | null,
  orderType?: string | null,
): { label: string; cls: string } | null {
  if (concluded) return { label: "Entregue no iFood", cls: "bg-green-100 text-green-700 border-green-200" };
  if (dispatched) return { label: "Saiu para entrega", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  if (status === "ready" && String(orderType).toUpperCase() === "TAKEOUT") {
    return { label: "Aguardando cliente retirar", cls: "bg-purple-100 text-purple-700 border-purple-200" };
  }
  switch (status) {
    case "pending": return { label: "Confirmado", cls: "bg-amber-100 text-amber-700 border-amber-200" };
    case "preparing": return { label: "Preparando", cls: "bg-orange-100 text-orange-700 border-orange-200" };
    case "ready": return { label: "Pronto", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "delivered": return { label: "Entregue", cls: "bg-green-100 text-green-700 border-green-200" };
    case "cancelled": return { label: "Cancelado", cls: "bg-red-100 text-red-700 border-red-200" };
    default: return null;
  }
}

export default function IFoodOrderChip({
  gatewayPaymentId, notes, status, ifoodDispatchedAt, ifoodConcludedAt,
  ifoodCancellationRequestedAt, ifoodOrderType, orderId,
  organizationId,
  ifoodPatchedAt, ifoodDriverName, ifoodDriverAssignedAt, ifoodScheduledFor,
}: Props) {
  const ifoodId = parseIFoodOrderId(gatewayPaymentId);
  const [busy, setBusy] = useState<"accept" | "deny" | null>(null);
  const [merchantCancelOpen, setMerchantCancelOpen] = useState(false);
  const [merchantCancelCode, setMerchantCancelCode] = useState<string>("");
  const [merchantCancelBusy, setMerchantCancelBusy] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [pickupBusy, setPickupBusy] = useState(false);
  if (!ifoodId) return null;
  const displayId = parseDisplayId(notes);
  const sl = statusLabel(status, ifoodDispatchedAt, ifoodConcludedAt, ifoodOrderType);
  const cancelRequested = !!ifoodCancellationRequestedAt && status !== "cancelled";
  const canMerchantCancel = !!orderId && status === "pending" && !cancelRequested;
  const isTakeout = String(ifoodOrderType || "").toUpperCase() === "TAKEOUT";
  const canValidatePickup = isTakeout && !!organizationId && !ifoodConcludedAt && (status === "preparing" || status === "ready");

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ifoodId);
    toast.success("orderId iFood copiado");
  };

  const copyForTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    const lines = [
      `iFood orderId: ${ifoodId}`,
      displayId ? `iFood displayId: ${displayId}` : null,
      orderId ? `Interno (TrendFood): ${orderId}` : null,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("IDs copiados p/ chamado iFood");
  };

  const handleCancel = async (action: "accept" | "deny") => {
    if (!orderId) return;
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-handle-cancellation", {
        body: { order_id: orderId, action },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if ((data as any)?.requires_ifood_app) {
        toast.warning("Responda também no app iFood", {
          description:
            (data as any)?.message ||
            "Esta solicitação está na Plataforma de Negociação do iFood. Atualizamos sua Cozinha; confirme a decisão no app/portal iFood.",
          duration: 8000,
        });
      } else {
        toast.success(action === "accept" ? "Cancelamento aceito no iFood" : "Cancelamento recusado no iFood");
      }
    } catch (e: any) {
      toast.error("Falha: " + (e?.message || "erro"));
    } finally { setBusy(null); }
  };

  const handleMerchantCancel = async () => {
    if (!orderId || !merchantCancelCode) return;
    const reason = MERCHANT_CANCEL_REASONS.find((r) => r.code === merchantCancelCode);
    if (!reason) return;
    setMerchantCancelBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-cancel-order", {
        body: { order_id: orderId, code: reason.code, reason_label: reason.label },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Pedido cancelado no iFood");
      setMerchantCancelOpen(false);
      setMerchantCancelCode("");
    } catch (e: any) {
      toast.error("Falha ao cancelar: " + (e?.message || "erro"));
    } finally {
      setMerchantCancelBusy(false);
    }
  };

  const handleValidatePickup = async () => {
    if (!organizationId || !pickupCode.trim()) return;
    setPickupBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-validate-pickup-code", {
        body: {
          organization_id: organizationId,
          ifood_order_id: ifoodId,
          code: pickupCode.trim(),
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.valid) {
        toast.success("Código de retirada válido! ✅");
        setPickupOpen(false);
        setPickupCode("");
      } else {
        toast.error("Código inválido. Confira com o cliente.", {
          description: (data as any)?.response?.message || undefined,
        });
      }
    } catch (e: any) {
      toast.error("Falha ao validar: " + (e?.message || "erro"));
    } finally {
      setPickupBusy(false);
    }
  };

  return (
    <div className="mt-1 inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        title={`Copiar orderId iFood: ${ifoodId}`}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 rounded-full pl-2 pr-1.5 py-0.5 hover:bg-red-200 transition-colors max-w-full"
      >
        <Utensils className="w-3 h-3 shrink-0" />
        <span className="shrink-0">iFood{displayId ? ` #${displayId}` : ""}</span>
        <span className="font-mono font-normal text-red-600/80 truncate max-w-[160px]">
          {ifoodId}
        </span>
        <Copy className="w-3 h-3 shrink-0" />
      </button>
      {sl && (
        <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sl.cls}`}>
          {sl.label}
        </span>
      )}
      {ifoodPatchedAt && (
        <span
          title={`Pedido alterado pelo cliente em ${new Date(ifoodPatchedAt).toLocaleString("pt-BR")}`}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-100 border border-orange-300 rounded-full px-2 py-0.5"
        >
          <Edit3 className="w-3 h-3" /> ALTERADO
        </span>
      )}
      {ifoodDriverName && (
        <span
          title={ifoodDriverAssignedAt ? `Designado em ${new Date(ifoodDriverAssignedAt).toLocaleString("pt-BR")}` : undefined}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5"
        >
          <Bike className="w-3 h-3" /> {ifoodDriverName}
        </span>
      )}
      {ifoodScheduledFor && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5"
        >
          <CalendarClock className="w-3 h-3" />
          Agendado iFood: {new Date(ifoodScheduledFor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </span>
      )}
      {canValidatePickup && (
        <Dialog open={pickupOpen} onOpenChange={setPickupOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-white border border-purple-300 hover:bg-purple-50 rounded-full px-2 py-0.5"
              title="Validar código de retirada do cliente"
            >
              <KeyRound className="w-3 h-3" />
              Validar código retirada
            </button>
          </DialogTrigger>
          <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Validar código de retirada</DialogTitle>
              <DialogDescription>
                Peça o código de retirada que o cliente recebeu no app iFood e digite abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <input
                inputMode="numeric"
                autoFocus
                maxLength={8}
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ""))}
                placeholder="Ex: 1234"
                className="w-full text-center text-2xl font-mono tracking-[0.4em] border-2 border-purple-200 rounded-lg py-3 focus:outline-none focus:border-purple-500"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPickupOpen(false)} disabled={pickupBusy}>
                Cancelar
              </Button>
              <Button onClick={handleValidatePickup} disabled={!pickupCode.trim() || pickupBusy}>
                {pickupBusy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Validar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {orderId && (
        <button
          type="button"
          onClick={copyForTicket}
          title="Copiar IDs (iFood + interno) p/ colar no chamado de homologação"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-full px-2 py-0.5"
        >
          <ClipboardList className="w-3 h-3" />
          Copiar p/ chamado
        </button>
      )}
      {canMerchantCancel && (
        <Dialog open={merchantCancelOpen} onOpenChange={setMerchantCancelOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-full px-2 py-0.5"
              title="Cancelar este pedido no iFood"
            >
              <Ban className="w-3 h-3" />
              Cancelar
            </button>
          </DialogTrigger>
          <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cancelar pedido iFood</DialogTitle>
              <DialogDescription>
                Esta ação cancela o pedido no iFood e na sua Cozinha. Não pode ser desfeita.
                Disponível apenas <strong>antes de confirmar</strong> o pedido.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Motivo do cancelamento</label>
              <Select value={merchantCancelCode} onValueChange={setMerchantCancelCode}>
                <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
                <SelectContent>
                  {MERCHANT_CANCEL_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMerchantCancelOpen(false)} disabled={merchantCancelBusy}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleMerchantCancel}
                disabled={!merchantCancelCode || merchantCancelBusy}
              >
                {merchantCancelBusy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Cancelar definitivamente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {cancelRequested && (
        <div className="w-full mt-1 flex items-center gap-1.5 flex-wrap p-1.5 rounded-md border border-orange-300 bg-orange-50">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800">
            <AlertTriangle className="w-3 h-3" />
            Cliente pediu cancelamento
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                disabled={!!busy}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded px-2 py-0.5 disabled:opacity-50"
              >
                {busy === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Aceitar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Aceitar cancelamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  O pedido será cancelado no iFood e na sua Cozinha. Não pode ser desfeito.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleCancel("accept")}>Sim, cancelar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                disabled={!!busy}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-white border border-orange-300 hover:bg-orange-100 rounded px-2 py-0.5 disabled:opacity-50"
              >
                {busy === "deny" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Recusar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Recusar cancelamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  O pedido continua em produção. O iFood será notificado da recusa.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleCancel("deny")}>Sim, recusar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}