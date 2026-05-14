import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Link2, RefreshCw, Unplug, Copy, Zap,
  CheckCircle2, AlertCircle, Circle, ExternalLink, FileDown, ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IFoodTabProps { orgId: string; }

interface Cred {
  id: string;
  organization_id: string;
  merchant_id: string | null;
  merchant_name: string | null;
  status: string;
  access_token: string | null;
  token_expires_at: string | null;
  last_polled_at: string | null;
  last_event_at: string | null;
}

interface EventRow {
  id: string;
  code: string;
  ifood_event_id: string | null;
  ifood_order_id: string | null;
  ifood_display_id: string | null;
  internal_order_id: string | null;
  source: string;
  received_at: string;
}

type ChecklistStatus = "ok" | "partial" | "missing";
interface ChecklistItem {
  status: ChecklistStatus;
  title: string;
  detail: string;
}

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

const IFoodTab = ({ orgId }: IFoodTabProps) => {
  const [cred, setCred] = useState<Cred | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [merchantId, setMerchantId] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: c } = await supabase.from("ifood_credentials" as any)
      .select("*").eq("organization_id", orgId).maybeSingle();
    setCred(c as any);
    if (c) {
      setMerchantId((c as any).merchant_id || "");
      setMerchantName((c as any).merchant_name || "");
    }
    const { data: ev } = await supabase.from("ifood_event_log" as any)
      .select("*").eq("organization_id", orgId)
      .order("received_at", { ascending: false }).limit(20);
    setEvents((ev || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const upsertAndConnect = async () => {
    if (!merchantId.trim()) { toast.error("Informe o Merchant ID"); return; }
    setBusy(true);
    try {
      await supabase.from("ifood_credentials" as any).upsert({
        organization_id: orgId,
        merchant_id: merchantId.trim(),
        merchant_name: merchantName.trim() || null,
        status: "pending",
      }, { onConflict: "organization_id" } as any);

      const { data, error } = await supabase.functions.invoke("ifood-auth", {
        body: { organization_id: orgId },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Conectado ao iFood com sucesso!");
      await load();
    } catch (e: any) {
      toast.error("Falha ao conectar: " + (e.message || "erro desconhecido"));
      await load();
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    if (!confirm("Desconectar do iFood? Os pedidos pararão de chegar.")) return;
    setBusy(true);
    try {
      await supabase.from("ifood_credentials" as any)
        .update({ status: "disconnected", access_token: null, refresh_token: null })
        .eq("organization_id", orgId);
      toast.success("Desconectado.");
      await load();
    } finally { setBusy(false); }
  };

  const forcePoll = async () => {
    setPolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("ifood-poll-events", { body: {} });
      if (error) throw error;
      const myResult = (data as any)?.results?.find((r: any) => r.org === orgId);
      if (myResult?.error) {
        toast.error("Polling falhou: " + myResult.error);
      } else if (myResult) {
        toast.success(`Polling ok — ${myResult.events ?? 0} evento(s), ${myResult.acked ?? 0} confirmado(s)`);
      } else {
        toast.success("Polling executado");
      }
      await load();
    } catch (e: any) {
      toast.error("Erro ao forçar polling: " + (e.message || "desconhecido"));
    } finally { setPolling(false); }
  };

  const pollAge = cred?.last_polled_at
    ? Math.round((Date.now() - new Date(cred.last_polled_at).getTime()) / 1000)
    : null;

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("orderId copiado");
  };

  const completedCount = CHECKLIST.filter((c) => c.status === "ok").length;
  const totalCount = CHECKLIST.length;
  const homologReady = completedCount === totalCount;

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

  const statusBadge = () => {
    const s = cred?.status || "disconnected";
    const map: Record<string, { color: string; label: string }> = {
      connected: { color: "bg-green-500", label: "Conectado" },
      pending: { color: "bg-yellow-500", label: "Aguardando" },
      error: { color: "bg-red-500", label: "Erro" },
      disconnected: { color: "bg-gray-400", label: "Desconectado" },
    };
    const m = map[s] || map.disconnected;
    return <Badge className={`${m.color} text-white`}>{m.label}</Badge>;
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integração iFood</h2>
        <p className="text-sm text-muted-foreground">Receba pedidos do iFood automaticamente na sua produção.</p>
      </div>

      {/* Painel de Homologação */}
      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Status de Homologação iFood</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Checklist técnico cobrindo todos os requisitos do iFood Developer Portal.
            </p>
          </div>
          <Badge className={homologReady ? "bg-green-500 text-white" : "bg-yellow-500 text-white"}>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Conexão</CardTitle>
          {statusBadge()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Merchant ID (loja iFood)</Label>
            <Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)}
              placeholder="ex: 12345678-9abc-def0-..." disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label>Nome da loja no iFood (opcional)</Label>
            <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Ex: Burger King Centro" disabled={busy} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={upsertAndConnect} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              {cred?.status === "connected" ? "Reconectar" : "Conectar"}
            </Button>
            {cred?.status === "connected" && (
              <>
                <Button variant="outline" onClick={forcePoll} disabled={busy || polling}>
                  {polling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Forçar polling
                </Button>
                <Button variant="outline" onClick={disconnect} disabled={busy}>
                  <Unplug className="w-4 h-4 mr-2" /> Desconectar
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={load} disabled={busy}>
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
          </div>

          {cred?.status === "connected" && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <div>
                Último polling:{" "}
                {cred.last_polled_at ? (
                  <>
                    {new Date(cred.last_polled_at).toLocaleString("pt-BR")}{" "}
                    <span className={pollAge != null && pollAge > 180 ? "text-red-500 font-semibold" : "text-green-600"}>
                      ({pollAge}s atrás)
                    </span>
                  </>
                ) : (
                  <span className="text-yellow-600">aguardando primeiro polling…</span>
                )}
              </div>
              <div>Merchant ID: <span className="font-mono">{cred.merchant_id}</span></div>
              <div>Último evento: {cred.last_event_at ? new Date(cred.last_event_at).toLocaleString("pt-BR") : "—"}</div>
              <div>Token expira em: {cred.token_expires_at ? new Date(cred.token_expires_at).toLocaleString("pt-BR") : "—"}</div>
              <div className="pt-1 italic">Polling automático rodando a cada 1 minuto via cron.</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos eventos (debug homologação)</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento recebido ainda.</p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded border text-xs">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                     <div className="flex gap-2 items-center flex-wrap">
                      <Badge variant="outline">{e.code}</Badge>
                      <span className="text-muted-foreground">{e.source}</span>
                      <span className="text-muted-foreground">{new Date(e.received_at).toLocaleString("pt-BR")}</span>
                      {e.ifood_event_id && (
                        <span className="font-mono text-[10px] text-muted-foreground/70 truncate max-w-[180px]">
                          evt: {e.ifood_event_id}
                        </span>
                      )}
                    </div>
                    {e.ifood_order_id && (
                      <div className="font-mono truncate">orderId: {e.ifood_order_id}{e.ifood_display_id ? ` (#${e.ifood_display_id})` : ""}</div>
                    )}
                  </div>
                  {e.ifood_order_id && (
                    <Button size="sm" variant="ghost" onClick={() => copyOrderId(e.ifood_order_id!)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IFoodTab;
