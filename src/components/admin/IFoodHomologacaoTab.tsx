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