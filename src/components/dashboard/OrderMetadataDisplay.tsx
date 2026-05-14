import { User, Phone, MapPin, Clock, CreditCard, Wallet, Ticket, FileText, IdCard, Truck, Package } from "lucide-react";
import { parseNotes } from "@/lib/formatReceiptText";

interface Props {
  notes?: string | null;
}

function Row({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${accent || "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-foreground">{label}:</span>{" "}
        <span className="text-muted-foreground break-words">{value}</span>
      </div>
    </div>
  );
}

export default function OrderMetadataDisplay({ notes }: Props) {
  if (!notes) return null;
  const p = parseNotes(notes);

  // Fallback: notes sem formato pipe → mostra como observação simples
  if (p.raw) {
    return (
      <div className="bg-muted/60 rounded-lg px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Obs:</span> {p.raw}
      </div>
    );
  }

  const hasAny =
    p.tipo || p.name || p.phone || p.address || p.bairro || p.frete ||
    p.payment || p.troco || p.doc || p.obs || p.agendado || p.cupom ||
    p.coleta || p.ifoodDisplay || p.brand;
  if (!hasAny) return null;

  return (
    <div className="bg-muted/60 rounded-lg px-3 py-2 space-y-1.5 border border-border/50">
      {p.ifoodDisplay && (
        <div className="flex items-center gap-1.5 -mt-0.5 mb-1">
          <span className="text-[10px] font-bold tracking-wide uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
            iFood #{p.ifoodDisplay}
          </span>
        </div>
      )}
      {p.tipo && (
        <Row icon={p.tipo.toLowerCase().includes("retirada") ? Package : Truck}
             label="Tipo" value={p.tipo} accent="text-primary" />
      )}
      {p.agendado && (
        <Row icon={Clock} label="Agendado" value={p.agendado} accent="text-amber-600" />
      )}
      {p.name && <Row icon={User} label="Cliente" value={p.name} />}
      {p.phone && <Row icon={Phone} label="Telefone" value={p.phone} />}
      {p.doc && (
        <Row icon={IdCard} label={p.docKind || "Documento"} value={p.doc} />
      )}
      {p.address && (
        <Row icon={MapPin} label="Endereço"
             value={p.bairro && !p.address.includes(p.bairro) ? `${p.address} — ${p.bairro}` : p.address} />
      )}
      {p.frete && <Row icon={Truck} label="Frete" value={p.frete} />}
      {p.coleta && <Row icon={Package} label="Código de coleta" value={p.coleta} accent="text-purple-600" />}
      {p.payment && (
        <Row icon={CreditCard} label="Pagamento"
             value={p.brand ? `${p.payment} (${p.brand})` : p.payment} accent="text-emerald-600" />
      )}
      {p.troco && (
        <Row icon={Wallet} label="Troco para" value={p.troco} accent="text-emerald-600" />
      )}
      {p.cupom && (
        <Row icon={Ticket} label="Cupom" value={p.cupom} accent="text-pink-600" />
      )}
      {p.obs && (
        <Row icon={FileText} label="Observação" value={p.obs} accent="text-foreground" />
      )}
    </div>
  );
}