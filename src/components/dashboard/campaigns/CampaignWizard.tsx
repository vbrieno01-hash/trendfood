import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, ArrowRight, ArrowLeft, Send, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useInactiveCustomersCount, useCreateAndSendCampaign, type CampaignCredits } from "@/hooks/useCampaignCredits";

interface Props {
  orgId: string;
  credits: CampaignCredits;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TEMPLATE_EXAMPLES = [
  "Oi! Sentimos sua falta na {loja} 🍔 Passa aqui hoje: pedido acima de R$40 ganha 10% off. Cupom: VOLTA10",
  "E aí, faz tempo hein! Bora comer algo? Hoje na {loja} tem frete grátis pra você. Vem!",
  "Fala! A {loja} tá com saudade. Passa lá que caprichamos no seu pedido 😉",
];

export default function CampaignWizard({ orgId, credits, open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(TEMPLATE_EXAMPLES[0]);

  const { data: recipientCount = 0, isLoading: countLoading } = useInactiveCustomersCount(orgId, inactiveDays);
  const send = useCreateAndSendCampaign(orgId);

  const available = credits.credits_total - credits.credits_used;
  const willSend = Math.min(recipientCount, available);

  const canProceed1 = recipientCount > 0;
  const canProceed2 = name.trim().length >= 3 && message.trim().length >= 20;

  const reset = () => {
    setStep(1);
    setName("");
    setMessage(TEMPLATE_EXAMPLES[0]);
    setInactiveDays(30);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSend = async () => {
    try {
      const result = await send.mutateAsync({
        name: name.trim(),
        inactive_days: inactiveDays,
        message_template: message.trim(),
      });
      if (!result.ok) {
        toast.error(errorLabel(result.error));
        return;
      }
      toast.success(`${result.enqueued} mensagens enfileiradas!`, {
        description: result.skipped
          ? `${result.skipped} foram ignoradas por falta de saldo.`
          : result.invalid_numbers
          ? `${result.invalid_numbers} números sem WhatsApp foram descartados.`
          : `Saldo restante: ${result.remaining_credits}`,
      });
      handleClose(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro_desconhecido";
      toast.error(errorLabel(msg));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova campanha ({step}/3)</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Público-alvo</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Clientes que fizeram pedido pela última vez há mais de:
              </p>
              <RadioGroup value={String(inactiveDays)} onValueChange={(v) => setInactiveDays(Number(v))}>
                {[30, 60, 90].map((d) => (
                  <label key={d} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
                    <RadioGroupItem value={String(d)} />
                    <span className="text-sm font-medium">{d} dias</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="text-2xl font-bold text-foreground">
                  {countLoading ? "..." : recipientCount}
                </div>
                <div className="text-xs text-muted-foreground">clientes serão contatados</div>
              </div>
            </div>
            {recipientCount === 0 && !countLoading && (
              <div className="text-xs text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Nenhum cliente inativo nesse período.
              </div>
            )}
            <div className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Antes do envio, validamos cada número na API do WhatsApp. Quem não tem conta é descartado e não consome créditos.</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="camp-name" className="text-sm font-semibold">Nome interno</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Reativação junho"
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="camp-msg" className="text-sm font-semibold">Mensagem</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Use <code className="text-primary">{"{loja}"}</code> pro nome da loja. O rodapé de descadastro é adicionado automaticamente.
              </p>
              <Textarea
                id="camp-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={500}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {TEMPLATE_EXAMPLES.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessage(t)}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/70 transition"
                  >
                    Exemplo {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted/40 space-y-2 text-sm">
              <Row label="Público" value={`${recipientCount} clientes (${inactiveDays}+ dias inativos)`} />
              <Row label="Vão receber agora" value={`${willSend} mensagens`} />
              <Row label="Saldo antes" value={`${available} de ${credits.credits_total}`} />
              <Row label="Saldo depois" value={`${available - willSend} de ${credits.credits_total}`} />
            </div>
            <div className="p-3 rounded-lg border border-border bg-background text-sm whitespace-pre-wrap">
              {message}
              {"\n\n"}
              <span className="text-muted-foreground italic">_Para não receber mais, responda SAIR._</span>
            </div>
            {willSend < recipientCount && (
              <div className="text-xs text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {recipientCount - willSend} clientes ficarão de fora por falta de saldo.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? handleClose(false) : setStep(step - 1))}
            disabled={send.isPending}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceed1) || (step === 2 && !canProceed2)}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSend} disabled={send.isPending || willSend === 0}>
              {send.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="w-4 h-4 mr-1" /> Enviar {willSend} msgs</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function errorLabel(code?: string): string {
  switch (code) {
    case "no_active_subscription": return "Assinatura de campanhas expirada ou inativa.";
    case "no_credits": return "Sem saldo de mensagens este mês.";
    case "no_recipients": return "Nenhum cliente elegível encontrado.";
    case "invalid_status": return "Essa campanha já foi enviada.";
    case "campaign_not_found": return "Campanha não encontrada.";
    default: return "Não foi possível enviar. Tente novamente.";
  }
}