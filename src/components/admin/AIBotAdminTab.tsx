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
import { Bot, Send, Trash2, Save, Loader2, Sparkles, MessageSquare, Power } from "lucide-react";

interface BotConfig {
  id: string;
  enabled: boolean;
  system_prompt: string;
  greeting_message: string;
  model: string;
  test_phone: string | null;
  test_org_id: string | null;
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
  const [testMessage, setTestMessage] = useState("");
  const [conversation, setConversation] = useState<QueueRow[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carrega config + lojas
  useEffect(() => {
    (async () => {
      const [{ data: cfg }, { data: orgList }] = await Promise.all([
        supabase
          .from("ai_bot_config")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("organizations").select("id, name, slug").order("name"),
      ]);
      setConfig(cfg as BotConfig | null);
      setOrgs((orgList as OrgOption[]) || []);
      setLoading(false);
    })();
  }, []);

  // Carrega histórico do test_phone + realtime
  useEffect(() => {
    if (!config?.test_phone) {
      setConversation([]);
      return;
    }
    const phone = config.test_phone;

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
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração salva!");
    }
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
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-bot-respond", {
        body: { phone: config.test_phone.replace(/\D/g, ""), message: testMessage.trim() },
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
    // RLS bloqueia delete normal — usamos service role via função? Por enquanto, marcamos como vazio só na UI:
    // Como a tabela tem delete=false na RLS pública, fazemos via admin role:
    const { error } = await supabase
      .from("fila_whatsapp")
      .delete()
      .eq("phone", config.test_phone.replace(/\D/g, ""));
    if (error) {
      toast.error("Erro: " + error.message);
    } else {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
          <Bot className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Robô de Atendimento — Sala de Testes</h2>
          <p className="text-sm text-muted-foreground">
            Configure e teste o atendente IA do WhatsApp em modo real antes de liberar pros lojistas.
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
                Quando ativo, mensagens do WhatsApp de teste são respondidas pela IA
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loja de teste (contexto)</Label>
              <Select
                value={config.test_org_id || ""}
                onValueChange={(v) => setConfig({ ...config, test_org_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja..." />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>WhatsApp de teste (somente números, ex: 5594981632225)</Label>
              <Input
                value={config.test_phone || ""}
                onChange={(e) => setConfig({ ...config, test_phone: e.target.value })}
                placeholder="5594981632225"
              />
              <p className="text-xs text-muted-foreground">
                Mensagens deste número serão respondidas automaticamente pelo robô
              </p>
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
                O cardápio, horários e bairros da loja escolhida são injetados automaticamente.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
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
                <p className="text-xs mt-1">Mande uma mensagem do WhatsApp ou use o simulador abaixo</p>
              </div>
            ) : (
              conversation.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* Mensagem do cliente */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-card border px-4 py-2 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{msg.incoming_message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  {/* Resposta do bot */}
                  {msg.ai_response && (
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{msg.ai_response}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Bot className="w-3 h-3 opacity-70" />
                          <p className="text-[10px] opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Dica: Você também pode mandar mensagem do seu WhatsApp ({config.test_phone || "..."}) pro
            número da Evolution e ver a conversa rolando aqui em tempo real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
