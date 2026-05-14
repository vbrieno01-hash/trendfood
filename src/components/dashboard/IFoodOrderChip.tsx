import { Copy, Utensils } from "lucide-react";
import { toast } from "sonner";

interface Props {
  gatewayPaymentId?: string | null;
  notes?: string | null;
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

export default function IFoodOrderChip({ gatewayPaymentId, notes }: Props) {
  const orderId = parseIFoodOrderId(gatewayPaymentId);
  if (!orderId) return null;
  const displayId = parseDisplayId(notes);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderId);
    toast.success("orderId iFood copiado");
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copiar orderId iFood: ${orderId}`}
      className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700 bg-red-100 border border-red-200 rounded-full pl-2 pr-1.5 py-0.5 hover:bg-red-200 transition-colors max-w-full"
    >
      <Utensils className="w-3 h-3 shrink-0" />
      <span className="shrink-0">iFood{displayId ? ` #${displayId}` : ""}</span>
      <span className="font-mono font-normal text-red-600/80 truncate max-w-[160px]">
        {orderId}
      </span>
      <Copy className="w-3 h-3 shrink-0" />
    </button>
  );
}