import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, AlertCircle, Circle, ExternalLink, FileDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type ChecklistStatus = "ok" | "partial" | "missing";
interface ChecklistItem { status: ChecklistStatus; title: string; detail: string; }

const CHECKLIST: ChecklistItem[] = [
  { status: "ok", title: "Polling 60s + /acknowledgment em lote",
    detail: "Edge function ifood-poll-events agendada via pg_cron a cada minuto. ACK enviado ao final de cada ciclo." },
  { status: "ok", title: "Confirmação DELIVERY/TAKEOUT no SLA",
    detail: "Pedido PLC entra como 'pending' no KDS com alarme contínuo. Aceitar dispara POST /orders/{id}/confirm em < 5 s." },
  { status: "ok", title: "Cancelamento com /cancellationReasons",
    detail: "Edge function ifood-cancellation-reasons busca motivos válidos da API antes de cancelar. Nada é hardcoded." },
  { status: "ok", title: "Bandeira do cartão + troco",
    detail: "Extraídos de payments[].card.brand e payments[].changeFor; impressos na comanda térmica." },
  { status: "ok", title: "Cupom (iFood vs Loja)",
    detail: "Diferenciado por benefits[].sponsorshipValues — exibido separadamente na comanda." },
  { status: "ok", title: "CPF/CNPJ + código de coleta",
    detail: "customer.documentNumber e pickupCode extraídos e impressos." },
  { status: "ok", title: "Observações de itens",
    detail: "items[].observations concatenadas no nome do item via buildItemName(). Aparecem na ficha de produção." },
  { status: "ok", title: "Deduplicação por event.id",
    detail: "UNIQUE INDEX em ifood_event_log(ifood_event_id). Reentregas do iFood são ignoradas em silêncio." },
  { status: "ok", title: "Sincronização externa (CFM/RPR/DSP/CAN)",
    detail: "Flag orders.ifood_synced_externally = true durante o eco; trigger SQL evita loop com a API iFood." },
  { status: "partial", title: "Plataforma de Negociação (HANDSHAKE_*)",
    detail: "Eventos HANDSHAKE_* são logados em ifood_event_log e o lojista é notificado via Telegram. Resposta automática ainda manual." },
  { status: "ok", title: "Webhook responde 202 + ACK",
    detail: "Edge function ifood-webhook responde 202 imediatamente e chama /acknowledgment de forma assíncrona." },
];

export default function IFoodHomologacaoTab() {
  const completedCount = CHECKLIST.filter((c) => c.status === "ok").length;
  const totalCount = CHECKLIST.length;
  const ready = completedCount === totalCount;

  const downloadDocs = async () => {
    try {
      const res = await fetch("/docs/IFOOD-HOMOLOGACAO.md");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TrendFood-iFood-Homologacao.md";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Documentação baixada");
    } catch {
      toast.error("Falha ao baixar documentação");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Homologação iFood</h2>
        <p className="text-sm text-muted-foreground">
          Checklist técnico do app distribuído TrendFood no iFood Developer Portal. CNPJ 66.067.207/0001-91.
        </p>
      </div>

      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Status de Homologação</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cobertura dos requisitos da Order API v3.
            </p>
          </div>
          <Badge className={ready ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}>
            {completedCount} / {totalCount}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST.map((item, i) => (
            <Collapsible key={i}>
              <CollapsibleTrigger className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left group">
                {item.status === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {item.status === "partial" && <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />}
                {item.status === "missing" && <Circle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className="text-sm flex-1">{item.title}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="text-xs text-muted-foreground pl-7 pr-2 pb-2 pt-1">
                {item.detail}
              </CollapsibleContent>
            </Collapsible>
          ))}

          <div className="flex flex-wrap gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={downloadDocs}>
              <FileDown className="w-4 h-4 mr-2" /> Baixar documentação técnica
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://developer.ifood.com.br/pt-BR/support" target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir ticket no iFood
              </a>
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground pt-2 italic">
            Dica: ao abrir o ticket, escolha categoria "Homologação" → "Aplicativo distribuído" e anexe a documentação acima.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}