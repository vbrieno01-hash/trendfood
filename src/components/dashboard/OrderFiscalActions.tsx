import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Loader2, ExternalLink, X, RefreshCw, Search } from "lucide-react";
import type { FiscalInvoice } from "@/hooks/useFiscalInvoices";
import { usePlatformFeatureFlags } from "@/hooks/usePlatformFeatureFlags";
import { useAuth } from "@/hooks/useAuth";
import FiscalEmailModal from "./FiscalEmailModal";
import FiscalEconfModal from "./FiscalEconfModal";

function statusMeta(s?: string) {
  switch (s) {
    case "authorized": return { label: "NFC-e autorizada", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
    case "processing":
    case "pending":    return { label: "Emitindo…",        cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    case "rejected":   return { label: "Rejeitada",        cls: "bg-destructive/15 text-destructive border-destructive/30" };
    case "cancelled":  return { label: "Cancelada",        cls: "bg-muted text-muted-foreground border-border" };
    case "blocked_quota": return { label: "Cota esgotada", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
    default:           return { label: "Sem NFC-e",        cls: "bg-muted text-muted-foreground border-border" };
  }
}

export default function OrderFiscalActions({
  orgId, orderId, invoice, compact = false,
}: {
  orgId: string;
  orderId: string;
  invoice?: FiscalInvoice | null;
  compact?: boolean;
}) {
  const { data: flags } = usePlatformFeatureFlags();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"emit" | "cancel" | "consult" | null>(null);
  const meta = statusMeta(invoice?.status);

  async function emit() {
    setBusy("emit");
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-emit-nfce", { body: { order_id: orderId } });
      if (error) {
        const status = (error as any)?.status ?? (error as any)?.context?.status;
        console.error("[fiscal-emit] invoke error", {
          name: (error as any)?.name,
          message: (error as any)?.message,
          status,
          context: (error as any)?.context,
          data,
        });
        const hint =
          status === 404 ? "Função não encontrada (verifique deploy)"
          : status === 401 ? "Não autorizado (sessão expirada?)"
          : status === 504 ? "Gateway timeout ao contatar a função"
          : (error as any)?.message || "Falha ao invocar função";
        throw new Error(hint);
      }
      if (!(data as any)?.ok) {
        console.warn("[fiscal-emit] business error", data);
        throw new Error((data as any)?.message || (data as any)?.error || "Falha ao emitir");
      }
      toast.success("Emissão solicitada");
      qc.invalidateQueries({ queryKey: ["fiscal_invoices", orgId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao emitir NFC-e");
    } finally { setBusy(null); }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      if (!invoice?.id) throw new Error("NFC-e ainda não emitida");
      const { data, error } = await supabase.functions.invoke("fiscal-cancel-nfce", {
        body: { invoice_id: invoice.id, motivo: "Cancelamento solicitado pelo lojista pelo painel." },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha ao cancelar");
      toast.success("Cancelamento solicitado");
      qc.invalidateQueries({ queryKey: ["fiscal_invoices", orgId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cancelar");
    } finally { setBusy(null); }
  }

  async function consult() {
    if (!invoice?.id) return;
    setBusy("consult");
    try {
      const { data, error } = await supabase.functions.invoke("fiscal-consult-nfce", {
        body: { invoice_id: invoice.id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok === false) throw new Error((data as any)?.message || "Falha ao consultar");
      const st = (data as any)?.status;
      toast.success(st === invoice.status ? "Sem alterações na SEFAZ" : `Nota atualizada para: ${st}`);
      qc.invalidateQueries({ queryKey: ["fiscal_invoices", orgId] });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao consultar SEFAZ");
    } finally { setBusy(null); }
  }

  const canCancel = invoice?.status === "authorized" && invoice.emitted_at
    && Date.now() - new Date(invoice.emitted_at).getTime() < 30 * 60 * 1000;
  const canEmit = !invoice || invoice.status === "rejected" || invoice.status === "blocked_quota";
  const isBusyStatus = invoice?.status === "pending" || invoice?.status === "processing";
  const canConsult = !!invoice?.id && (isBusyStatus || invoice?.status === "authorized");
  const canEmail = invoice?.status === "authorized" && !!invoice.id;
  const canEconf = invoice?.status === "authorized" && !!invoice.id;

  if (!flags?.fiscal_enabled && !isAdmin) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "text-xs" : "text-sm"}`}>
      <Badge variant="outline" className={`${meta.cls} gap-1 px-2 py-0.5`}>
        {isBusyStatus && <Loader2 className="w-3 h-3 animate-spin" />}
        <FileText className="w-3 h-3" />
        {meta.label}
        {invoice?.numero ? <span className="opacity-70">#{invoice.numero}</span> : null}
      </Badge>
      {(invoice?.status === "rejected" || invoice?.status === "blocked_quota") && invoice.rejection_reason && (
        <span className="text-xs text-destructive line-clamp-1" title={invoice.rejection_reason}>
          {invoice.rejection_reason}
        </span>
      )}
      {canEmit && (
        <Button size="sm" variant="outline" onClick={emit} disabled={busy === "emit"}>
          {busy === "emit" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          {invoice?.status === "rejected" || invoice?.status === "blocked_quota" ? "Reemitir" : "Emitir NFC-e"}
        </Button>
      )}
      {invoice?.danfe_url && (
        <Button asChild size="sm" variant="secondary">
          <a href={invoice.danfe_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3 h-3 mr-1" /> DANFE
          </a>
        </Button>
      )}
      {canConsult && (
        <Button size="sm" variant="ghost" onClick={consult} disabled={busy === "consult"} title="Reconciliar com SEFAZ">
          {busy === "consult" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
          Consultar SEFAZ
        </Button>
      )}
      {canEmail && (
        <FiscalEmailModal invoiceId={invoice.id} />
      )}
      {canEconf && (isAdmin || flags?.fiscal_enabled) && (
        <FiscalEconfModal invoiceId={invoice.id} />
      )}
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
              <X className="w-3 h-3 mr-1" /> Cancelar NFC-e
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar esta NFC-e?</AlertDialogTitle>
              <AlertDialogDescription>
                O cancelamento só é aceito em até 30 minutos após a emissão. Essa ação é definitiva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={cancel} disabled={busy === "cancel"}>
                {busy === "cancel" ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Cancelando…</> : "Sim, cancelar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}