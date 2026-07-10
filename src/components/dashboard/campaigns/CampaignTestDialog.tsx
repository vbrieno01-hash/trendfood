import { useState } from "react";
import { Loader2, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  orgId: string;
  orgName: string;
  orgWhatsapp: string | null;
  creditsAvailable: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const DEFAULT_TEMPLATE =
  "Oi! Sentimos sua falta na {loja} 🍔\nPassa aqui hoje: pedido acima de R$40 ganha 10% off. Cupom: VOLTA10\n\n_Para não receber mais, responda SAIR._";

function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

export default function CampaignTestDialog({
  orgId,
  orgName,
  orgWhatsapp,
  creditsAvailable,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);

  const phone = orgWhatsapp ? normalizePhone(orgWhatsapp) : "";
  const finalMessage = template.replaceAll("{loja}", orgName);

  async function handleSend() {
    if (!phone) {
      toast.error("Cadastre o WhatsApp da loja em Configurações antes de testar.");
      return;
    }
    if (creditsAvailable <= 0) {
      toast.error("Sem créditos. Compre um pacote pra testar.");
      return;
    }
    setSending(true);
    try {
      // 1) Debita 1 crédito
      const { error: updErr } = await supabase.rpc("increment_campaign_credits_used", {
        _organization_id: orgId,
        _amount: 1,
      });
      if (updErr) {
        // Fallback: update direto
        const { data: cur } = await supabase
          .from("campaign_credits")
          .select("credits_used")
          .eq("organization_id", orgId)
          .maybeSingle();
        if (cur) {
          const { error: e2 } = await supabase
            .from("campaign_credits")
            .update({ credits_used: (cur.credits_used ?? 0) + 1 })
            .eq("organization_id", orgId);
          if (e2) throw e2;
        }
      }

      // 2) Enfileira mensagem
      const { error: outErr } = await supabase.from("whatsapp_outbox").insert({
        organization_id: orgId,
        phone,
        message: finalMessage,
        event_type: "campaign_test",
        status: "pending",
      });
      if (outErr) throw outErr;

      // 3) Dispara worker imediatamente
      supabase.functions.invoke("whatsapp-outbox-dispatch", { body: {} }).catch(() => {});

      qc.invalidateQueries({ queryKey: ["campaign_credits", orgId] });
      toast.success("Teste enviado! Confira seu WhatsApp em alguns segundos.");
      onOpenChange(false);
    } catch (e) {
      console.error("[campaign-test] send error", e);
      toast.error("Não foi possível enviar o teste. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Enviar teste pro seu WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envia uma mensagem real pro número da loja pra você conferir formatação e entrega. Consome <strong>1 crédito</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Enviar para</div>
            <div className="font-semibold text-foreground">
              {orgWhatsapp || <span className="text-red-500">Nenhum número cadastrado</span>}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">
              Mensagem (use {"{loja}"} para o nome da loja)
            </label>
            <Textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={5}
              className="text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-1">Preview</div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm whitespace-pre-wrap text-foreground">
              {finalMessage}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || !phone || creditsAvailable <= 0}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-1" /> Enviar agora (1 crédito)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}