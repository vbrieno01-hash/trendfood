import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, AlertCircle, Circle, ExternalLink, FileDown, ChevronDown, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type ChecklistStatus = "ok" | "partial" | "missing";
interface ChecklistItem { status: ChecklistStatus; title: string; detail: string; }

interface Scenario {
  number: number;
  title: string;
  status: ChecklistStatus;
  steps: string[];
  evidence: string[];
  note?: string;
}

const SCENARIOS: Scenario[] = [
  {
    number: 1,
    title: "Pedido agendado com voucher VOUCHER_ENTGRATIS",
    status: "ok",
    steps: [
      "No app iFood, criar pedido para o dia seguinte e aplicar o cupom VOUCHER_ENTGRATIS.",
      "Aguardar o pedido aparecer na Cozinha do TrendFood (≤60s).",
      "Abrir o pedido e demonstrar na tela: data/hora do agendamento e linha CUPOM (IFOOD/LOJA).",
      "Clicar em 'Copiar p/ chamado' no chip iFood para obter os IDs.",
    ],
    evidence: [
      "Chip 'Agendado para …' visível na ficha (campo AGENDADO no notes).",
      "Linha CUPOM com sponsorshipValues separados.",
    ],
  },
  {
    number: 2,
    title: "Pedido manual com cartão na entrega + cancelamento",
    status: "ok",
    steps: [
      "Criar pedido manual escolhendo cartão (crédito/débito) com pagamento NA ENTREGA.",
      "Aceitar o pedido na Cozinha (botão Aceitar).",
      "Clicar em 'Cancelar' no chip iFood, escolher motivo (lista vinda de /cancellationReasons).",
      "Confirmar e mostrar status 'Cancelado' + log no ifood_event_log.",
    ],
    evidence: [
      "BANDEIRA do cartão impressa na ficha.",
      "Status final = cancelled; entrada OUT_MERCHANT_CANCEL no log.",
    ],
  },
  {
    number: 3,
    title: "Pedido para retirada no local (TAKEOUT)",
    status: "ok",
    steps: [
      "Criar pedido de retirada no app iFood.",
      "Na Cozinha, percorrer todas as etapas: Aceitar → Iniciar preparo → Pronto p/ retirada → Retirado/Concluído.",
      "Mostrar o chip 'Retirada' e o código de coleta (COLETA:) na ficha.",
    ],
    evidence: [
      "ifood_order_type = TAKEOUT, sem registro em deliveries.",
      "Eventos CFM/RPR/RTP/CON refletidos em tempo real.",
    ],
  },
  {
    number: 4,
    title: "Cancelamento iniciado pela Plataforma de Negociação",
    status: "partial",
    steps: [
      "Disparar cancelamento pelo cliente/iFood (evento CCAN/CANR).",
      "Mostrar o alerta 'Cliente pediu cancelamento' aparecendo na Cozinha.",
      "Demonstrar Aceitar e Recusar (gravar os 2 caminhos se possível).",
    ],
    evidence: [
      "Campo orders.ifood_cancellation_requested_at preenchido pelo webhook.",
      "Edge ifood-handle-cancellation chama /requestCancellation ou /denyCancellation.",
    ],
    note: "Quando a API responde 'Negotiation platform is only available in version 2', nossa edge marca cancelado localmente e o lojista finaliza no app/portal iFood — explicar isso na gravação.",
  },
  {
    number: 5,
    title: "Dinheiro com troco + observação + CPF/CNPJ",
    status: "ok",
    steps: [
      "Criar pedido em DINHEIRO informando: valor para troco, observação e CPF ou CNPJ na nota.",
      "Abrir o pedido na Cozinha e mostrar TROCO, OBS e CPF/CNPJ na tela.",
      "Opcional: imprimir a comanda térmica para evidenciar os mesmos campos.",
    ],
    evidence: [
      "Campos TROCO, OBS, CPF/CNPJ presentes em orders.notes.",
      "OrderMetadataDisplay e ThermalReceipt renderizam os 3 campos.",
    ],
  },
];

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
  { status: "ok", title: "Plataforma de Negociação (HANDSHAKE / Disputes)",
    detail: "Eventos HANDSHAKE_* / DISPUTE são persistidos em ifood_disputes com expires_at, e respondidos via edge function ifood-handshake-respond (POST /disputes/{id}/accept|reject|alternative). pg_cron marca como expired automaticamente." },
  { status: "ok", title: "Webhook responde 202 + ACK",
    detail: "Edge function ifood-webhook responde 202 imediatamente e chama /acknowledgment de forma assíncrona." },
  { status: "ok", title: "ORDER_PATCHED — modificações de pedido",
    detail: "Polling e webhook tratam ORDER_PATCHED: DELETE_ITEMS remove order_items por nome, ADD_ITEMS insere, e gera comanda 'ATUALIZACAO DE PEDIDO' na fila de impressão. orders.ifood_patched_at registra o evento." },
  { status: "ok", title: "Pedidos agendados (orderTiming=SCHEDULED)",
    detail: "schedule.deliveryDateTimeStart é persistido em orders.ifood_scheduled_for; KDS pode usar para suprimir alarme e exibir horário." },
  { status: "ok", title: "Atribuição de entregador iFood (ASSIGN_DRIVER)",
    detail: "Evento ASSIGN_DRIVER salva orders.ifood_driver_assigned_at e ifood_driver_name. Tracking via edge function ifood-tracking (GET /orders/{id}/tracking) com cache 30s respeitando rate-limit." },
  { status: "ok", title: "validatePickupCode (coleta do entregador)",
    detail: "Edge function ifood-validate-pickup-code → POST /orders/{id}/validatePickupCode. Loga OUT_PICKUP_CODE_VALID/INVALID." },
  { status: "ok", title: "verifyDeliveryCode (entrega ao cliente)",
    detail: "Edge function ifood-verify-delivery-code → POST /orders/{id}/verifyDeliveryCode. Loga OUT_DELIVERY_CODE_VALID/INVALID." },
];

export default function IFoodHomologacaoTab() {
  const completedCount = CHECKLIST.filter((c) => c.status === "ok").length;
  const totalCount = CHECKLIST.length;
  const ready = completedCount === totalCount;

  const [credInfo, setCredInfo] = useState<{
    client_id_masked: string | null;
    client_secret_masked: string | null;
    updated_at: string | null;
    current_client_id?: string;
    current_client_secret?: string;
    db_configured?: boolean;
    env_configured?: boolean;
    active_source?: "db" | "env" | "none";
  } | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCreds = async () => {
    setLoadingCreds(true);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-update-platform-creds", { body: { action: "read" } });
      if (error) throw error;
      setCredInfo(data);
      if (data?.current_client_id) setClientId(data.current_client_id);
      if (data?.current_client_secret) setClientSecret(data.current_client_secret);
    } catch (e: any) {
      toast.error("Falha ao carregar credenciais", { description: e?.message });
    } finally {
      setLoadingCreds(false);
    }
  };

  useEffect(() => { loadCreds(); }, []);

  const saveCreds = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha Client ID e Client Secret");
      return;
    }
    if (!confirm("Ao salvar, TODAS as lojas conectadas ao iFood serão desconectadas e precisarão reconectar. Continuar?")) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-update-platform-creds", {
        body: { action: "save", client_id: clientId.trim(), client_secret: clientSecret.trim() },
      });
      if (error) throw error;
      toast.success("Credenciais salvas", {
        description: `${data?.disconnected_count ?? 0} loja(s) desconectada(s). Tokens antigos invalidados.`,
      });
      await loadCreds();
    } catch (e: any) {
      toast.error("Falha ao salvar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

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

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Roteiro dos 5 cenários (gravação dos vídeos)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Siga o passo a passo de cada cenário. Use o botão "Copiar p/ chamado" no chip iFood (na Cozinha) para obter o orderId interno + iFood e colar no ticket.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {SCENARIOS.map((s) => (
            <Collapsible key={s.number} defaultOpen={false}>
              <CollapsibleTrigger className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left group">
                {s.status === "ok" && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {s.status === "partial" && <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />}
                {s.status === "missing" && <Circle className="w-4 h-4 text-red-500 shrink-0" />}
                <span className="text-sm flex-1">
                  <strong>Cenário {s.number}</strong> — {s.title}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-7 pr-2 pb-3 pt-1 space-y-2 text-xs">
                <div>
                  <div className="font-medium text-foreground mb-1">Passo a passo</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                    {s.steps.map((st, i) => <li key={i}>{st}</li>)}
                  </ol>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">O que provar na tela</div>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {s.evidence.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
                {s.note && (
                  <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-700 dark:text-yellow-400">
                    ⚠ {s.note}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
          <div className="text-[11px] text-muted-foreground pt-2 italic border-t">
            Em cada chamado, informe ambos: <code>orderId iFood</code> (UUID retornado pela API) e o <code>orderId interno</code> do TrendFood.
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Credenciais iFood (plataforma)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Client ID e Client Secret usados por todas as lojas. Ao salvar, tokens antigos são invalidados automaticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-medium text-foreground">Atual</div>
            {loadingCreds ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Carregando…</div>
            ) : (
              <>
                {credInfo?.active_source === "db" && (
                  <div className="text-green-600 dark:text-green-400 font-medium">✓ Usando credenciais salvas no painel</div>
                )}
                {credInfo?.active_source === "env" && (
                  <div className="text-green-600 dark:text-green-400 font-medium">✓ Usando credenciais antigas do servidor (já configuradas)</div>
                )}
                {credInfo?.active_source === "none" && (
                  <div className="text-red-600 dark:text-red-400 font-medium">⚠ Nenhuma credencial configurada</div>
                )}
                <div><span className="text-muted-foreground">Client ID: </span><code>{credInfo?.client_id_masked || <span className="text-muted-foreground italic">(servidor)</span>}</code></div>
                <div><span className="text-muted-foreground">Client Secret: </span><code>{credInfo?.client_secret_masked || <span className="text-muted-foreground italic">(servidor)</span>}</code></div>
                {credInfo?.updated_at && (
                  <div className="text-muted-foreground pt-1">Atualizado em {new Date(credInfo.updated_at).toLocaleString("pt-BR")}</div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifood-cid" className="text-xs">Client ID</Label>
            <Input id="ifood-cid" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="ex: 1a2b3c4d-..." autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifood-cs" className="text-xs">Client Secret</Label>
            <div className="relative">
              <Input id="ifood-cs" type={showSecret ? "text" : "password"} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="••••••••" autoComplete="off" className="pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSecret((s) => !s)}>
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-700 dark:text-yellow-400">
            ⚠️ Os campos vêm preenchidos com as credenciais atuais. Edite apenas quando o iFood liberar novas — ao salvar, todas as lojas conectadas terão tokens revogados e precisarão reconectar (re-vincular merchant).
          </div>

          <Button onClick={saveCreds} disabled={saving || !clientId.trim() || !clientSecret.trim()} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar e invalidar tokens antigos
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}