import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Send, Bell, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface PlatformCfg {
  id: string;
  admin_telegram_chat_id: string | null;
  admin_telegram_events: Record<string, boolean>;
}

interface LogRow {
  id: string;
  event_type: string;
  message: string;
  status: string;
  error: string | null;
  created_at: string;
}

const EVENT_LABELS: { key: string; label: string; description: string }[] = [
  { key: "new_signup", label: "🆕 Novo cadastro", description: "Notifica quando uma nova loja se cadastra" },
  { key: "subscription_change", label: "💰 Mudança de assinatura", description: "Upgrades, downgrades e cancelamentos" },
  { key: "referral_converted", label: "🤝 Indicação convertida", description: "Quando uma indicação vira assinante pago" },
  { key: "critical_error", label: "🚨 Erro crítico", description: "Erros em checkout, pagamento ou impressão" },
  { key: "phantom_orders", label: "🛒 Pedidos fantasmas", description: "Notifica quando pedidos vazios são limpos" },
  { key: "subscription_expiring", label: "⏰ Assinatura expirando", description: "Aviso 3 dias antes da expiração" },
  { key: "daily_digest", label: "📊 Resumo diário (09h)", description: "Métricas das últimas 24h: cadastros, MRR, pedidos, erros" },
  { key: "weekly_digest", label: "📈 Resumo semanal (domingo)", description: "Comparativo com a semana anterior" },
];

export default function AdminTelegramTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [cfg, setCfg] = useState<PlatformCfg | null>(null);
  const [chatId, setChatId] = useState("");
  const [events, setEvents] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: cfgData }, { data: logsData }] = await Promise.all([
      (supabase.from("platform_config") as any)
        .select("id, admin_telegram_chat_id, admin_telegram_events")
        .limit(1)
        .maybeSingle(),
      (supabase.from("admin_telegram_log") as any)
        .select("id, event_type, message, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (cfgData) {
      setCfg(cfgData as PlatformCfg);
      setChatId((cfgData as any).admin_telegram_chat_id ?? "");
      setEvents(((cfgData as any).admin_telegram_events ?? {}) as Record<string, boolean>);
    }
    if (logsData) setLogs(logsData as LogRow[]);
    setLoading(false);
  }

  async function handleSave() {
    if (!cfg) return;
    setSaving(true);
    const { error } = await (supabase.from("platform_config") as any)
      .update({
        admin_telegram_chat_id: chatId.trim() || null,
        admin_telegram_events: events,
      })
      .eq("id", cfg.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Configurações salvas!");
  }

  async function handleTest() {
    if (!chatId.trim()) {
      toast.error("Cola seu Chat ID antes de testar.");
      return;
    }
    setTesting(true);
    // Save first to ensure chat_id is persisted
    if (cfg) {
      await (supabase.from("platform_config") as any)
        .update({ admin_telegram_chat_id: chatId.trim() })
        .eq("id", cfg.id);
    }
    const { data, error } = await supabase.functions.invoke("admin-telegram-notify", {
      body: { event_type: "test", payload: {} },
    });
    setTesting(false);
    if (error) {
      toast.error("Falha no teste: " + error.message);
    } else if ((data as any)?.ok) {
      toast.success("Mensagem enviada! Checa o Telegram 📱");
      void load();
    } else {
      toast.error("Não enviou: " + ((data as any)?.reason ?? "erro desconhecido"));
    }
  }

  function setEventToggle(key: string, value: boolean) {
    setEvents((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Telegram Admin (ao vivo)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Receba tudo que acontece na plataforma em tempo real, no seu Telegram pessoal.
        </p>
      </div>

      {/* Chat ID config */}
      <Card className="p-6 space-y-4">
        <div>
          <Label htmlFor="admin-chat-id" className="text-base font-semibold">Seu Chat ID pessoal</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Pegue seu Chat ID enviando uma mensagem pro bot{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              @userinfobot <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="admin-chat-id"
            placeholder="Ex: 123456789"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="font-mono"
          />
          <Button onClick={handleTest} disabled={testing || !chatId.trim()} variant="outline">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">Testar</span>
          </Button>
        </div>
      </Card>

      {/* Event toggles */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-base">Quais eventos enviar?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Liga/desliga cada tipo de notificação.
          </p>
        </div>
        <div className="space-y-3 divide-y divide-border">
          {EVENT_LABELS.map((ev) => (
            <div key={ev.key} className="flex items-start justify-between gap-4 pt-3 first:pt-0">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{ev.label}</div>
                <div className="text-xs text-muted-foreground">{ev.description}</div>
              </div>
              <Switch
                checked={events[ev.key] !== false}
                onCheckedChange={(v) => setEventToggle(ev.key, v)}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Salvar configurações
        </Button>
      </Card>

      {/* Recent logs */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Últimas notificações enviadas</h3>
            <p className="text-xs text-muted-foreground mt-1">Auditoria das últimas 20 mensagens.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>Atualizar</Button>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma notificação enviada ainda. Configure seu Chat ID e clique em "Testar".
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
              >
                {log.status === "sent" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-xs mt-1 line-clamp-2 whitespace-pre-wrap text-muted-foreground">
                    {log.message.replace(/<[^>]+>/g, "")}
                  </div>
                  {log.error && (
                    <div className="text-xs mt-1 text-destructive">{log.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}