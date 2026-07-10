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
  const finalMessage = template.split("{loja}").join(orgName);

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
      const { data, error } = await supabase.functions.invoke("campaign-send-test", {
        body: { orgId, message: finalMessage },
      });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string };
      if (!res?.ok) {
        const map: Record<string, string> = {
          no_whatsapp: "Cadastre o WhatsApp da loja em Configurações antes de testar.",
          no_credits: "Sem créditos. Compre um pacote pra testar.",
          forbidden: "Você não tem permissão nesta loja.",
          unauthorized: "Sessão expirada. Faça login novamente.",
          race_retry: "Tente novamente em instantes.",
        };
        toast.error(map[res?.error ?? ""] ?? "Não foi possível enviar o teste. Tente novamente.");
        return;
      }
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