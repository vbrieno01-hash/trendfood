import { Copy, Utensils } from "lucide-react";
import { toast } from "sonner";

interface Props {
  gatewayPaymentId?: string | null;
  notes?: string | null;
  status?: string | null;
  ifoodDispatchedAt?: string | null;
  ifoodConcludedAt?: string | null;
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

function statusLabel(status?: string | null, dispatched?: string | null, concluded?: string | null): { label: string; cls: string } | null {
  if (concluded) return { label: "Entregue no iFood", cls: "bg-green-100 text-green-700 border-green-200" };
  if (dispatched) return { label: "Saiu para entrega", cls: "bg-blue-100 text-blue-700 border-blue-200" };
  switch (status) {
    case "pending": return { label: "Confirmado", cls: "bg-amber-100 text-amber-700 border-amber-200" };
    case "preparing": return { label: "Preparando", cls: "bg-orange-100 text-orange-700 border-orange-200" };
    case "ready": return { label: "Pronto", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "delivered": return { label: "Entregue", cls: "bg-green-100 text-green-700 border-green-200" };
    case "cancelled": return { label: "Cancelado", cls: "bg-red-100 text-red-700 border-red-200" };
    default: return null;
  }
}

export default function IFoodOrderChip({ gatewayPaymentId, notes, status, ifoodDispatchedAt, ifoodConcludedAt }: Props) {
  const orderId = parseIFoodOrderId(gatewayPaymentId);
  if (!orderId) return null;
  const displayId = parseDisplayId(notes);
  const sl = statusLabel(status, ifoodDispatchedAt, ifoodConcludedAt);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderId);
    toast.success("orderId iFood copiado");
  };

  return (
    <div className="mt-1 inline-flex flex-wrap items-center gap-1.5">
    <button
      type="button"
      onClick={copy}
      title={`Copiar orderId iFood: ${orderId}`}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 rounded-full pl-2 pr-1.5 py-0.5 hover:bg-red-200 transition-colors max-w-full"
    >
      <Utensils className="w-3 h-3 shrink-0" />
      <span className="shrink-0">iFood{displayId ? ` #${displayId}` : ""}</span>
      <span className="font-mono font-normal text-red-600/80 truncate max-w-[160px]">
        {orderId}
      </span>
      <Copy className="w-3 h-3 shrink-0" />
    </button>
    {sl && (
      <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${sl.cls}`}>
        {sl.label}
      </span>
    )}
    </div>
  );
}