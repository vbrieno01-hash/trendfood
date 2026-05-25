import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot, Send, Trash2, Save, Loader2, Sparkles, MessageSquare, Power,
  Trash, CheckCircle2, RefreshCw, AlertCircle, Check, Eye, EyeOff, Copy, Plug,
} from "lucide-react";

interface BotConfig {
  id: string;
  enabled: boolean;
  system_prompt: string;
  greeting_message: string;
  model: string;
  test_phone: string | null;
  test_org_id: string | null;
  test_instance_name: string | null;
  test_instance_token: string | null;
}

interface QueueRow {
  id: string;
  phone: string;
  incoming_message: string;
  ai_response: string | null;
  created_at: string;
  status: string;
}

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido + barato)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (ultra rápido)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (mais inteligente)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (mais caro)" },
];

export default function AIBotAdminTab() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  // Sandbox: URL + token + nome de uma instância criada no painel uazapi.
  // Tudo persistido em ai_bot_config (global). NÃO toca em whatsapp_instances de loja.
  const [serverUrl, setServerUrl] = useState("");
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [testingStatus, setTestingStatus] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status?: number; body?: string; phone?: string | null; statusName?: string | null } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [conversation, setConversation] = useState<QueueRow[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  // Carrega config + lojas
  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: orgList }] = await Promise.all([
        supabase
          .from("ai_bot_config")
          .select("id, enabled, system_prompt, greeting_message, model, test_phone, test_org_id, test_instance_name, test_instance_token")
          .is("organization_id", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("organizations").select("id, name, slug").order("name"),
      ]);
      const typed = cfg as BotConfig | null;
      setConfig(typed);
      setOrgs((orgList as OrgOption[]) || []);
      if (typed) {
        setInstanceToken(typed.test_instance_token || "");
        setInstanceName(typed.test_instance_name || "");
        setServerUrl("https://free.uazapi.com");
      }
      setLoading(false);
    })();
  }, []);

  // Carrega histórico do test_phone + realtime
  useEffect(() => {
    if (!config?.test_phone) {
      setConversation([]);
      return;
    }
    const phone = config.test_phone.replace(/\D/g, "");
    if (!phone) return;

    const fetchHistory = async () => {
      const { data } = await supabase
        .from("fila_whatsapp")
        .select("*")
        .eq("phone", phone)
        .order("created_at", { ascending: true })
        .limit(50);
      setConversation((data as QueueRow[]) || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    fetchHistory();

    const channel = supabase
      .channel(`fila_wa_${phone}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_whatsapp", filter: `phone=eq.${phone}` },
        () => fetchHistory(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config?.test_phone]);

  const handleSaveCredentials = async () => {
    if (!config) return;
    if (!config.test_org_id) {
      toast.error("Escolha uma loja de teste primeiro (pra carregar cardápio/horários no contexto)");
      return;
    }
    const token = instanceToken.trim();
    const name = instanceName.trim();
    if (!token && !name) {
      toast.error("Informe pelo menos o token ou o nome da instância");
      return;
    }
    setSavingCreds(true);
    try {
      const { error } = await supabase
        .from("ai_bot_config")
        .update({
          test_instance_name: name || null,
          test_instance_token: token || null,
        })
        .eq("id", config.id);
      if (error) throw error;
      setConfig({ ...config, test_instance_name: name || null, test_instance_token: token || null });
      toast.success("Credenciais do sandbox salvas");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || "erro"));
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTestStatus = async () => {
    const url = serverUrl.trim().replace(/\/$/, "");
    const token = instanceToken.trim();
    if (!url || !token) {
      toast.error("Preencha URL e token antes de testar");
      return;
    }
    setTestingStatus(true);
    setTestResult(null);
    try {
      // uazapi: /instance/status é GET com header `token`
      const res = await fetch(`${url}/instance/status`, {
        method: "GET",
        headers: { token },
      });
      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      const statusName = parsed?.instance?.status || parsed?.status || null;
      const phone =
        parsed?.instance?.phoneConnected ||
        parsed?.instance?.owner ||
        parsed?.instance?.phone ||
        parsed?.phone ||
        null;
      setTestResult({ ok: res.ok, status: res.status, body: text.slice(0, 400), phone, statusName });
      if (res.ok) {
        toast.success(`Servidor respondeu: ${statusName || res.status}`);
      } else if (res.status === 401 || res.status === 403) {
        toast.error("Token recusado pelo servidor (401/403). Confira o token da instância.");
      } else if (res.status === 404) {
        toast.error("Endpoint /instance/status não encontrado (404). Confira a URL do servidor.");
      } else if (res.status === 405) {
        toast.error("Método não aceito (405). Esse servidor uazapi não expõe /instance/status via GET.");
      } else {
        toast.error(`Servidor retornou ${res.status}`);
      }
    } catch (e: any) {
      setTestResult({ ok: false, body: e.message });
      toast.error("Falha ao alcançar o servidor: " + (e.message || "erro"));
    } finally {
      setTestingStatus(false);
    }
  };

  const handleClearInstance = async () => {
    if (!config) return;
    if (!confirm("Apagar credenciais do sandbox?")) return;
    setClearing(true);
    try {
      const { error } = await supabase
        .from("ai_bot_config")
        .update({ test_instance_name: null, test_instance_token: null })
        .eq("id", config.id);
      if (error) throw error;
      setInstanceToken("");
      setInstanceName("");
      setConfig({ ...config, test_instance_name: null, test_instance_token: null });
      toast.success("Credenciais apagadas");
    } catch (e: any) {
      toast.error("Erro: " + (e.message || "erro"));
    } finally {
      setClearing(false);
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(WEBHOOK_URL);
      toast.success("URL do webhook copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_bot_config")
      .update({
        enabled: config.enabled,
        system_prompt: config.system_prompt,
        greeting_message: config.greeting_message,
        model: config.model,
        test_phone: config.test_phone?.replace(/\D/g, "") || null,
        test_org_id: config.test_org_id,
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração salva!");
  };

  const handleSimulate = async () => {
    if (!config?.test_phone || !testMessage.trim()) {
      toast.error("Defina o WhatsApp de teste e a mensagem");
      return;
    }
    if (!config.enabled) {
      toast.error("Ative o robô primeiro");
      return;
    }
    if (!config.test_org_id) {
      toast.error("Selecione a loja de teste");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-bot-respond", {
        body: {
          phone: config.test_phone.replace(/\D/g, ""),
          message: testMessage.trim(),
          organization_id: config.test_org_id,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTestMessage("");
      toast.success("Mensagem enviada");
    } catch (err: any) {
      toast.error("Falha: " + (err.message || "erro"));
    } finally {
      setSending(false);
    }
  };

  const handleClearConversation = async () => {
    if (!config?.test_phone) return;
    if (!confirm("Apagar todo o histórico desta conversa de teste?")) return;
    const { error } = await supabase
      .from("fila_whatsapp")
      .delete()
      .eq("phone", config.test_phone.replace(/\D/g, ""));
    if (error) toast.error("Erro: " + error.message);
    else {
      setConversation([]);
      toast.success("Conversa limpa");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Configuração não encontrada.
        </CardContent>
      </Card>
    );
  }

  const hasInstance = !!(config.test_instance_token || config.test_instance_name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <Bot className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Robô de Atendimento — Sandbox</h2>
          <p className="text-sm text-muted-foreground">
            Modo manual: cole URL + token de uma instância criada no painel uazapi
            e atrele a uma loja de teste pra validar o robô.
          </p>
        </div>
        <div className="ml-auto">
          <Badge
            variant={config.enabled ? "default" : "secondary"}
            className={config.enabled ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            <Power className="w-3 h-3 mr-1" />
            {config.enabled ? "Ativo" : "Desativado"}
          </Badge>
        </div>
      </div>

      {/* Conexão WhatsApp (uazapiGO) — Sandbox real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="w-5 h-5 text-primary" />
            Conexão WhatsApp (Sandbox)
          </CardTitle>
          <CardDescription>
            Cole URL + token de uma instância criada no painel uazapi e atrele à loja de teste.
            Configure o webhook abaixo no painel uazapi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Loja de teste</Label>
            <Select
              value={config.test_org_id || ""}
              onValueChange={(v) => setConfig({ ...config, test_org_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja..." />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!config.test_org_id ? (
            <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Selecione uma loja acima para começar.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>URL do servidor uazapi</Label>
                  <Input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://free.uazapi.com"
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Token da instância (do painel uazapi)</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showToken ? "text" : "password"}
                      value={instanceToken}
                      onChange={(e) => setInstanceToken(e.target.value)}
                      placeholder="cole aqui o token da instância"
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setShowToken((v) => !v)}
                      title={showToken ? "Ocultar" : "Mostrar"}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome da instância (referência)</Label>
                  <Input
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="teste-bruno"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveCredentials} disabled={savingCreds}>
                  {savingCreds ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Salvar credenciais
                </Button>
                <Button variant="outline" onClick={handleTestStatus} disabled={testingStatus}>
                  {testingStatus ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                  Testar /status
                </Button>
                {hasInstance && (
                  <Button variant="destructive" onClick={handleClearInstance} disabled={clearing} className="ml-auto">
                    <Trash className="w-4 h-4 mr-1.5" />
                    Apagar credenciais
                  </Button>
                )}
              </div>

              {testResult && (
                <div
                  className={`rounded-lg border p-3 text-xs space-y-1 ${
                    testResult.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    {testResult.ok
                      ? `Servidor respondeu OK${testResult.statusName ? ` · status: ${testResult.statusName}` : ""}`
                      : `Falha · HTTP ${testResult.status ?? "?"}`}
                  </div>
                  {testResult.phone && (
                    <div className="font-mono">Telefone conectado: +{testResult.phone}</div>
                  )}
                  {testResult.body && (
                    <div className="font-mono text-muted-foreground break-all whitespace-pre-wrap">
                      {testResult.body}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-2">
                <div className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Configure o webhook no painel uazapi
                </div>
                <div className="text-muted-foreground">
                  Na instância → Webhooks → habilite e cole:
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 rounded bg-background border font-mono text-[10px] break-all">
                    {WEBHOOK_URL}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyWebhook} className="h-7 text-xs shrink-0">
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="text-muted-foreground">
                  Em "Escutar eventos" coloque: <code className="px-1 rounded bg-background border">messages</code>
                </div>
              </div>

              {hasInstance && (
                <div className="rounded-lg border bg-muted/20 p-3 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Credenciais do sandbox salvas. Mensagens recebidas nessa instância vão ser respondidas usando o contexto da loja de teste.
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Status do robô */}
      {(() => {
        const missing: string[] = [];
        if (!config.enabled) missing.push('ativar o switch "Robô ativo"');
        if (!config.test_phone) missing.push('preencher "WhatsApp de teste"');
        if (!config.test_org_id) missing.push('escolher "Loja de teste"');
        if (!hasInstance) missing.push("salvar URL + token da instância acima");

        if (missing.length === 0) {
          return (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">Robô ativo e configurado ✓</p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Mande WhatsApp do número <strong className="font-mono">{config.test_phone}</strong> pro número conectado. Resposta aparece em segundos abaixo.
                </p>
              </div>
            </div>
          );
        }
        return (
          <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="text-sm flex-1">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Robô não vai responder ainda — falta:</p>
              <ul className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1.5 space-y-1 list-disc list-inside">
                {missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          </div>
        );
      })()}

      {/* Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configuração
          </CardTitle>
          <CardDescription>Persona, modelo e contexto do robô</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-base font-semibold">Robô ativo</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quando ativo, mensagens recebidas pela instância de teste são respondidas pela IA
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <Select
                value={config.model}
                onValueChange={(v) => setConfig({ ...config, model: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>WhatsApp de teste (só números)</Label>
              <Input
                value={config.test_phone || ""}
                onChange={(e) => setConfig({ ...config, test_phone: e.target.value })}
                placeholder="5594981632225"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Mensagem de boas-vindas</Label>
              <Input
                value={config.greeting_message}
                onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Persona / instruções (system prompt)</Label>
              <Textarea
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Cardápio, horários e bairros da loja escolhida são injetados automaticamente.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar configuração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversa ao vivo */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Conversa ao vivo
              </CardTitle>
              <CardDescription>
                {config.test_phone
                  ? `Histórico em tempo real do WhatsApp ${config.test_phone}`
                  : "Configure o WhatsApp de teste para ver a conversa"}
              </CardDescription>
            </div>
            {conversation.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearConversation}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Limpar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-xl bg-muted/20 h-[500px] overflow-y-auto p-4 space-y-3">
            {conversation.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <Bot className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhuma mensagem ainda</p>
                <p className="text-xs mt-1">Mande mensagem pelo WhatsApp ou use o simulador abaixo</p>
              </div>
            ) : (
              conversation.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-card border px-4 py-2 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{msg.incoming_message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  {msg.ai_response && (
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{msg.ai_response}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Bot className="w-3 h-3 opacity-70" />
                          <p className="text-[10px] opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2">
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Simular mensagem do cliente..."
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSimulate();
                }
              }}
            />
            <Button onClick={handleSimulate} disabled={sending || !testMessage.trim()} size="lg">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}