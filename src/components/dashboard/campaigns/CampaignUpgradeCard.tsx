import { Megaphone, Sparkles, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Card de ativação da assinatura Campanhas WhatsApp.
 * Onda 2 vai plugar o Mercado Pago aqui. Por enquanto avisa o usuário.
 */
export default function CampaignUpgradeCard({ orgId }: { orgId: string }) {
  return (
    <div className="dashboard-glass rounded-2xl p-6 border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shrink-0">
          <Megaphone className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-foreground">Campanhas WhatsApp</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              Novo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Chame de volta clientes que sumiram. Dispara ofertas direto no zap deles.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <Feat icon={<Users className="w-4 h-4" />} label="250 mensagens/mês" />
            <Feat icon={<Sparkles className="w-4 h-4" />} label="Envio automático" />
            <Feat icon={<CheckCircle2 className="w-4 h-4" />} label="Cancele quando quiser" />
          </div>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <div>
              <div className="text-3xl font-bold text-foreground">
                R$ 19<span className="text-lg">,90</span>
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </div>
              <div className="text-xs text-muted-foreground">Requer Robô WhatsApp ativo</div>
            </div>
            <Button
              size="lg"
              onClick={() => {
                toast.info("Cobrança automática chega em breve.", {
                  description:
                    "Enquanto isso, chame o suporte no WhatsApp pra liberar de graça pro teu teste.",
                  action: {
                    label: "Falar com suporte",
                    onClick: () =>
                      window.open(
                        "https://wa.me/5516988083263?text=" +
                          encodeURIComponent(
                            "Oi! Quero ativar o add-on Campanhas WhatsApp na minha loja."
                          ),
                        "_blank"
                      ),
                  },
                });
              }}
              className="ml-auto"
            >
              Ativar por R$ 19,90/mês
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/40">
      <div className="text-primary">{icon}</div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );
}