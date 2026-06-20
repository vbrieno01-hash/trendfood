import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCw, PowerOff, CheckCircle2, MessageSquare, Bot, QrCode, Lock } from "lucide-react";
import WhatsAppAutoStatusCard from "./WhatsAppAutoStatusCard";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformFeatureFlags } from "@/hooks/usePlatformFeatureFlags";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface AIBotTabProps {
  orgId: string;
}

interface InstanceRow {
  id: string;
  instance_name: string;
  status: string;
  phone_connected: string | null;
  connected_at: string | null;
}

interface BotConfig {
  id: string;
  enabled: boolean;
  greeting_message: string;
  system_prompt: string;
  model: string;
}

interface QueueRow {
  id: string;
  phone: string;
  incoming_message: string;
  ai_response: string | null;
  status: string;
  created_at: string;
}

const AIBotTab = ({ orgId }: AIBotTabProps) => {
  const { isAdmin } = useAuth();
  const { data: flags } = usePlatformFeatureFlags();
  const waEnabled = !!flags?.whatsapp_enabled || isAdmin;

  // Per-store gate: admin must allow this org explicitly
  const { data: botAllowed, isLoading: loadingAllowed } = useQuery({
    queryKey: ["wa-bot-allowed", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("whatsapp_bot_allowed")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      return !!(data as any)?.whatsapp_bot_allowed;
    },
    staleTime: 30_000,
  });

  if (!waEnabled) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Robô do WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground">
            Avisa o cliente em cada etapa do pedido sem você apertar nada.
          </p>
        </div>
        <ComingSoonBot />
      </div>
    );
  }

  if (!isAdmin && !loadingAllowed && botAllowed === false) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Robô do WhatsApp
          </h2>
        </div>
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">Recurso bloqueado</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                O recurso de Robô de WhatsApp não está ativo no seu plano.
                Entre em contato com o suporte para liberar.
              </p>
            </div>
            <Button asChild>
              <a
                href="https://wa.me/5583998244382?text=Olá%2C%20quero%20liberar%20o%20Robô%20de%20WhatsApp%20na%20minha%20loja"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com o suporte
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BotPanel orgId={orgId} />
      <WhatsAppAutoStatusCard orgId={orgId} />
    </div>
  );
};

export default AIBotTab;

/* ======================== BOT PANEL (todas as lojas) ======================== */

const BotPanel = ({ orgId }: { orgId: string }) => {
  const { data: org } = useQuery({
    queryKey: ["org-plan", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("subscription_plan, subscription_status, trial_ends_at, used_first_month_promo")
        .eq("id", orgId)
        .maybeSingle();
      return data;
    },
  });
  const plan = usePlanLimits(org as any);
  const isPaidPlan = plan.canAccess("ai_bot");
  const [instance, setInstance] = useState<InstanceRow | null>(null);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [qrcode, setQrcode] = useState<string | null>(null);

  // Load all
  const loadAll = async () => {
    const [instRes, cfgRes, qRes] = await Promise.all([
      supabase.from("whatsapp_instances").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase.from("ai_bot_config").select("*").eq("organization_id", orgId).maybeSingle(),
      supabase
        .from("fila_whatsapp")
        .select("id,phone,incoming_message,ai_response,status,created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setInstance(instRes.data as InstanceRow | null);
    setConfig(cfgRes.data as BotConfig | null);
    setQueue((qRes.data as QueueRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel(`aibot-queue-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_whatsapp", filter: `organization_id=eq.${orgId}` },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      // fetch direto com query string — supabase.functions.invoke nao suporta query params em GET
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-instance-status?organization_id=${orgId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao buscar status");
      if (json.instance) setInstance(json.instance);
      if (json.qrcode) setQrcode(json.qrcode);
      toast.success("Status atualizado");
    } catch (e: any) {
      toast.error("Falha ao atualizar status: " + (e?.message ?? ""));
    } finally {
      setRefreshing(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("Desconectar o WhatsApp do bot? Você precisará escanear o QR Code novamente.")) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke("uazapi-disconnect", {
        body: { organization_id: orgId, delete_instance: false },
      });
      if (error) throw error;
      toast.success("WhatsApp desconectado");
      await loadAll();
    } catch (e) {
      toast.error("Falha ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    setQrcode(null);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-create-instance", {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      if (data?.instance) setInstance(data.instance);
      if (data?.qrcode) setQrcode(data.qrcode);
      toast.success("Escaneie o QR Code no WhatsApp");
    } catch (e) {
      toast.error("Falha ao iniciar conexão");
    } finally {
      setConnecting(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_bot_config")
      .update({
        enabled: config.enabled,
        greeting_message: config.greeting_message,
        system_prompt: config.system_prompt,
        model: config.model,
      })
      .eq("id", config.id);
    setSaving(false);
    if (error) {
      // Trigger de gate de plano retorna a mensagem pronta
      toast.error(error.message || "Falha ao salvar");
    }
    else toast.success("Configurações salvas");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = instance?.status === "connected";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Robô de Atendimento
          </h2>
          <p className="text-sm text-muted-foreground">
            Atendimento automático 24h via WhatsApp.
          </p>
        </div>
      </div>

      {!isPaidPlan && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold">Robô de IA exige plano Pro</p>
              <p className="text-sm text-muted-foreground">
                Você pode conectar o WhatsApp e usar os avisos automáticos no plano Free.
                Para que o robô responda os clientes automaticamente, ative o plano Pro.
              </p>
              <Button asChild size="sm">
                <Link to="/dashboard?tab=plan">Ver planos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status card */}
      <Card>
        <CardContent className="pt-6">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">WhatsApp conectado</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {instance?.phone_connected ? `+${instance.phone_connected}` : "Número não detectado"}
                    {" · "}
                    Instância: {instance?.instance_name}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={refreshStatus} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Atualizar status
                </Button>
                <Button size="sm" variant="destructive" onClick={disconnect} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <QrCode className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">WhatsApp desconectado</p>
                <p className="text-sm text-muted-foreground">
                  Conecte um número do WhatsApp para o robô atender seus clientes.
                </p>
              </div>
              {qrcode ? (
                <div className="space-y-2">
                  <img
                    src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`}
                    alt="QR Code WhatsApp"
                    className="mx-auto w-56 h-56 rounded border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp → Aparelhos conectados → Conectar aparelho
                  </p>
                  <Button size="sm" variant="outline" onClick={refreshStatus} disabled={refreshing}>
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Já escaneei
                  </Button>
                </div>
              ) : (
                <Button onClick={connect} disabled={connecting}>
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Conectar WhatsApp
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot config */}
      {config && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Bot ativo</p>
                <p className="text-xs text-muted-foreground">
                  Quando ligado, responde automaticamente as mensagens recebidas.
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => setConfig({ ...config, enabled: v })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="greet">Mensagem de boas-vindas</Label>
              <Input
                id="greet"
                value={config.greeting_message}
                onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt do robô (instruções de atendimento)</Label>
              <Textarea
                id="prompt"
                rows={6}
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Diga ao robô como ele deve se comportar, o tom, e o que ele pode oferecer.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo de IA</Label>
              <select
                id="model"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (rápido, recomendado)</option>
                <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (mais econômico)</option>
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (mais inteligente)</option>
              </select>
            </div>

            <Button onClick={saveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar configurações
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="font-semibold">Conversas recentes</p>
          </div>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Mande "oi" para o número conectado para testar.
            </p>
          ) : (
            <div className="space-y-3">
              {queue.map((q) => (
                <div key={q.id} className="rounded-lg border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      +{q.phone}
                    </span>
                    <Badge variant={q.status === "respondido" ? "default" : "secondary"} className="text-xs">
                      {q.status}
                    </Badge>
                  </div>
                  <p className="text-foreground">
                    <span className="text-muted-foreground">Cliente:</span> {q.incoming_message}
                  </p>
                  {q.ai_response && (
                    <p className="text-foreground">
                      <span className="text-muted-foreground">Bot:</span> {q.ai_response}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(q.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ======================== COMING SOON (default) ======================== */

const ComingSoonBot = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Robô de Atendimento</h2>
        <p className="text-sm text-muted-foreground">
          Atendimento automático 24h por WhatsApp para sua loja.
        </p>
      </div>

      <Card className="border-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-5 py-10">
            <div className="relative mx-auto w-36 h-36">
              <div className="animate-[botFloat_3s_ease-in-out_infinite]">
                <svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-36 h-36">
                  <circle cx="70" cy="70" r="58" fill="url(#botGlow)" />
                  <line x1="70" y1="22" x2="70" y2="34" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="70" cy="20" r="4" fill="hsl(var(--primary))" className="animate-[botPulse_1.4s_ease-in-out_infinite]" />
                  <rect x="38" y="34" width="64" height="48" rx="12" fill="hsl(var(--primary))" />
                  <rect x="42" y="38" width="56" height="40" rx="9" fill="hsl(var(--primary) / 0.85)" />
                  <g style={{ transformBox: "fill-box", transformOrigin: "center" }} className="animate-[botLook_6s_ease-in-out_infinite]">
                    <g style={{ transformBox: "fill-box", transformOrigin: "center" }} className="animate-[botBlink_4s_ease-in-out_infinite]">
                      <circle cx="56" cy="56" r="6" fill="white" />
                      <circle cx="56" cy="56" r="2.5" fill="hsl(var(--primary))" />
                    </g>
                    <g style={{ transformBox: "fill-box", transformOrigin: "center" }} className="animate-[botBlink_4s_ease-in-out_infinite]">
                      <circle cx="84" cy="56" r="6" fill="white" />
                      <circle cx="84" cy="56" r="2.5" fill="hsl(var(--primary))" />
                    </g>
                  </g>
                  <path d="M60 70 Q70 75 80 70" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <rect x="64" y="82" width="12" height="6" fill="hsl(var(--primary) / 0.7)" />
                  <rect x="34" y="88" width="72" height="34" rx="10" fill="hsl(var(--primary))" />
                  <rect x="40" y="94" width="60" height="22" rx="6" fill="hsl(var(--primary) / 0.75)" />
                  <circle cx="56" cy="105" r="3" fill="hsl(142 71% 45%)" className="animate-[botLed_1.2s_ease-in-out_infinite]" />
                  <circle cx="70" cy="105" r="3" fill="hsl(48 96% 53%)" className="animate-[botLed_1.2s_ease-in-out_0.4s_infinite]" />
                  <circle cx="84" cy="105" r="3" fill="hsl(217 91% 60%)" className="animate-[botLed_1.2s_ease-in-out_0.8s_infinite]" />
                  <ellipse cx="70" cy="130" rx="32" ry="4" fill="hsl(var(--foreground) / 0.18)" className="animate-[botShadow_3s_ease-in-out_infinite]" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                  <defs>
                    <radialGradient id="botGlow" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold tracking-wide animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
              </span>
              EM BREVE
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Robô de Atendimento com IA</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Atendimento automático 24h via WhatsApp. Responde dúvidas dos clientes,
                mostra cardápio, anota pedidos e transfere pra você quando precisar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes botFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes botPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.25); } }
        @keyframes botBlink { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes botLook { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-2.5px); } 75% { transform: translateX(2.5px); } }
        @keyframes botLed { 0%,100% { opacity: 0.25; } 50% { opacity: 1; } }
        @keyframes botShadow { 0%,100% { transform: scaleX(1); opacity: 0.3; } 50% { transform: scaleX(0.85); opacity: 0.5; } }
      `}</style>
    </div>
  );
};
