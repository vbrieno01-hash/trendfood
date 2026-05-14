import { useState } from "react";
import { Copy, Utensils, AlertTriangle, Check, X, Loader2, Ban } from "lucide-react";
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
}: Props) {
  const ifoodId = parseIFoodOrderId(gatewayPaymentId);
  const [busy, setBusy] = useState<"accept" | "deny" | null>(null);
  const [merchantCancelOpen, setMerchantCancelOpen] = useState(false);
  const [merchantCancelCode, setMerchantCancelCode] = useState<string>("");
  const [merchantCancelBusy, setMerchantCancelBusy] = useState(false);
  if (!ifoodId) return null;
  const displayId = parseDisplayId(notes);
  const sl = statusLabel(status, ifoodDispatchedAt, ifoodConcludedAt, ifoodOrderType);
  const cancelRequested = !!ifoodCancellationRequestedAt && status !== "cancelled";
  const canMerchantCancel = !!orderId && status === "pending" && !cancelRequested;

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ifoodId);
    toast.success("orderId iFood copiado");
  };

  const handleCancel = async (action: "accept" | "deny") => {
    if (!orderId) return;
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-handle-cancellation", {
        body: { order_id: orderId, action },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(action === "accept" ? "Cancelamento aceito no iFood" : "Cancelamento recusado no iFood");
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