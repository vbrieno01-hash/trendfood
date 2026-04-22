import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2, Send, Bell, CheckCircle2, XCircle, ExternalLink,
  Plus, Trash2, ChevronDown, ChevronUp, Pause, Play, User, AlertTriangle, Search,
} from "lucide-react";

interface Recipient {
  id: string;
  name: string;
  chat_id: string;
  active: boolean;
  events: Record<string, boolean>;
}

interface LogRow {
  id: string;
  event_type: string;
  message: string;
  status: string;
  error: string | null;
  created_at: string;
  recipient_name: string | null;
}

/** Per-recipient diagnostic state populated lazily after recipients load. */
interface DiagInfo {
  /** ISO timestamp of the most recent log row with status='sent' for this recipient. */
  lastSentAt: string | null;
  /** Result of the last `get_chat_info` lookup (null until the user clicks Verificar). */
  chat: { first_name?: string | null; last_name?: string | null; username?: string | null; type?: string | null; title?: string | null } | null;
  /** Error from the last `get_chat_info` call, if any. */
  chatError: string | null;
  /** Loading state for `get_chat_info`. */
  loadingChat: boolean;
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
  { key: "payment_confirmed", label: "💵 Pagamento confirmado", description: "Quando um pagamento de assinatura é aprovado no Mercado Pago" },
  { key: "payment_failed", label: "❌ Falha de cobrança", description: "Cartão recusado ou pagamento de assinatura falhou" },
  { key: "trial_expiring", label: "⏰ Trial acabando (D-3 / D-1 / hoje)", description: "Aviso pra você ligar e converter antes do trial expirar" },
  { key: "hot_lead", label: "🔥 Lead quente (loja Free movimentada)", description: "Loja Free com 30+ pedidos no dia — pronta pra upgrade" },
  { key: "cold_store", label: "😴 Loja fria (risco de churn)", description: "Loja Pro/Enterprise sem pedidos há 7+ dias" },
];

export default function AdminTelegramTab() {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newChatId, setNewChatId] = useState("");
  const [adding, setAdding] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botInfoLoading, setBotInfoLoading] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  // Fetch bot username when Add dialog opens (cached after first call)
  useEffect(() => {
    if (!addOpen || botUsername) return;
    setBotInfoLoading(true);
    supabase.functions
      .invoke("admin-telegram-notify", { body: { action: "bot_info" } })
      .then(({ data }: any) => {
        if (data?.username) setBotUsername(data.username);
      })
      .catch(() => { /* ignore — fallback shows generic instructions */ })
      .finally(() => setBotInfoLoading(false));
  }, [addOpen, botUsername]);

  /** Translate raw Telegram errors into clear PT-BR instructions. */
  function explainError(rawError: string | null | undefined, recipientName: string | null | undefined): string {
    const err = String(rawError || "").toLowerCase();
    const who = recipientName || "o destinatário";
    const botRef = botUsername ? `@${botUsername}` : "o bot da plataforma";

    if (err.includes("chat not found")) {
      return `${who} ainda não iniciou o ${botRef}. Peça para abrir o ${botRef} no Telegram e enviar /start. Iniciar o /start em @userinfobot só serve pra pegar o ID — cada bot precisa do /start próprio.`;
    }
    if (err.includes("bot was blocked") || err.includes("blocked by the user")) {
      return `${who} bloqueou ${botRef}. Peça pra desbloquear nas conversas do Telegram e enviar /start novamente.`;
    }
    if (err.includes("user is deactivated")) {
      return `A conta de ${who} no Telegram foi desativada.`;
    }
    if (err.includes("unauthorized") || err.includes("token")) {
      return `Token do bot inválido. Verifique a conexão Telegram em Connectors.`;
    }
    if (err.includes("too many requests") || err.includes("rate")) {
      return `Telegram pediu pra reduzir o ritmo (rate limit). Tente de novo em alguns segundos.`;
    }
    return rawError || "Erro desconhecido ao enviar.";
  }

  async function load() {
    setLoading(true);
    const [{ data: recData }, { data: logsData }] = await Promise.all([
      (supabase.from("admin_telegram_recipients") as any)
        .select("id, name, chat_id, active, events")
        .order("created_at", { ascending: true }),
      (supabase.from("admin_telegram_log") as any)
        .select("id, event_type, message, status, error, created_at, recipient_name")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setRecipients((recData ?? []) as Recipient[]);
    if (logsData) setLogs(logsData as LogRow[]);
    setLoading(false);
  }

  async function handleAdd() {
    const name = newName.trim();
    const chatId = newChatId.trim();
    if (!name || !chatId) {
      toast.error("Preencha nome e Chat ID.");
      return;
    }
    setAdding(true);
    // default: receives all events (toggles default true via missing key)
    const { error } = await (supabase.from("admin_telegram_recipients") as any)
      .insert({ name, chat_id: chatId, active: true, events: {} });
    if (error) {
      setAdding(false);
      toast.error("Erro ao adicionar: " + error.message);
      return;
    }

    // Send welcome message automatically (background, non-blocking for UX flow)
    let addedByName = "um administrador";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      addedByName = user?.email?.split("@")[0] || "um administrador";
    } catch { /* ignore */ }

    const { data: welcomeData, error: welcomeErr } = await supabase.functions.invoke(
      "admin-telegram-notify",
      { body: { action: "welcome_admin", chat_id: chatId, recipient_name: name, added_by: addedByName } },
    );
    setAdding(false);

    if (welcomeErr || (welcomeData as any)?.ok === false) {
      const rawErr = (welcomeData as any)?.error || welcomeErr?.message || "";
      toast.warning(
        `Destinatário adicionado, mas a boas-vindas falhou: ${explainError(rawErr, name)}`,
        { duration: 12000 },
      );
    } else {
      toast.success(`Destinatário adicionado! Boas-vindas enviada pra ${name} 📱`);
    }

    setNewName("");
    setNewChatId("");
    setAddOpen(false);
    void load();
  }

  async function handleToggleActive(r: Recipient) {
    setBusyId(r.id);
    const { error } = await (supabase.from("admin_telegram_recipients") as any)
      .update({ active: !r.active })
      .eq("id", r.id);
    setBusyId(null);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    toast.success(r.active ? "Pausado." : "Ativado.");
    void load();
  }

  async function handleDelete(r: Recipient) {
    setBusyId(r.id);
    const { error } = await (supabase.from("admin_telegram_recipients") as any)
      .delete()
      .eq("id", r.id);
    setBusyId(null);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    toast.success("Destinatário removido.");
    void load();
  }

  async function handleEventToggle(r: Recipient, key: string, value: boolean) {
    const newEvents = { ...r.events, [key]: value };
    // Optimistic update
    setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, events: newEvents } : x)));
    const { error } = await (supabase.from("admin_telegram_recipients") as any)
      .update({ events: newEvents })
      .eq("id", r.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      void load();
    }
  }

  async function handleTest(r: Recipient) {
    setBusyId(r.id);
    const { data, error } = await supabase.functions.invoke("admin-telegram-notify", {
      body: { event_type: "test", payload: { _target_recipient_id: r.id } },
    });
    setBusyId(null);
    if (error) {
      toast.error("Falha no teste: " + error.message);
    } else if ((data as any)?.sent > 0) {
      toast.success(`Mensagem enviada pra ${r.name}! 📱`);
      void load();
    } else {
      const d = data as any;
      const friendly = explainError(d?.first_error, d?.first_error_recipient ?? r.name);
      toast.error(friendly, { duration: 12000 });
      void load();
    }
  }

  function eventsSummary(events: Record<string, boolean>): string {
    const disabled = EVENT_LABELS.filter((ev) => events[ev.key] === false).length;
    if (disabled === 0) return "Recebe TODOS os eventos";
    const enabled = EVENT_LABELS.length - disabled;
    return `Recebe ${enabled} de ${EVENT_LABELS.length} eventos`;
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
          Adicione você, sócios ou equipe — cada destinatário recebe só os eventos que importam pra ele.
        </p>
      </div>

      {/* Recipients */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-base">📡 Destinatários conectados</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {recipients.length === 0
                ? "Nenhum destinatário ainda. Adicione o primeiro abaixo."
                : `${recipients.length} destinatário(s) configurado(s).`}
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar destinatário</DialogTitle>
                <DialogDescription>
                  Cadastre uma pessoa que vai receber as notificações da plataforma no Telegram.
                </DialogDescription>
              </DialogHeader>

              {/* Critical warning: each bot needs its own /start */}
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Antes de funcionar, siga 3 passos:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                  <li>
                    Pegue o Chat ID em{" "}
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      @userinfobot <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Abra{" "}
                    {botInfoLoading ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" /> identificando bot…
                      </span>
                    ) : botUsername ? (
                      <a
                        href={`https://t.me/${botUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        @{botUsername} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="font-semibold">o bot da plataforma</span>
                    )}
                    {" "}e envie <code className="px-1 py-0.5 rounded bg-muted text-xs">/start</code>{" "}
                    <span className="font-semibold">← passo crítico</span>
                  </li>
                  <li>Cole o Chat ID abaixo</li>
                </ol>
                <div className="text-xs text-muted-foreground pt-1 border-t border-amber-500/20">
                  ⚠️ Se pular o passo 2, o Telegram bloqueia o envio com "chat not found".
                </div>
              </div>

              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="rec-name">Apelido</Label>
                  <Input
                    id="rec-name"
                    placeholder="Ex: Breno, Sócio, Atendimento..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="rec-chat-id">Chat ID</Label>
                  <Input
                    id="rec-chat-id"
                    placeholder="Ex: 123456789"
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button onClick={handleAdd} disabled={adding}>
                  {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {recipients.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            Clique em <b>Adicionar</b> pra cadastrar o primeiro destinatário.
          </div>
        ) : (
          <div className="space-y-3">
            {recipients.map((r) => {
              const isExpanded = expandedId === r.id;
              const isBusy = busyId === r.id;
              return (
                <div key={r.id} className="rounded-lg border bg-card/50">
                  {/* Header */}
                  <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{r.name}</span>
                        {r.active ? (
                          <Badge variant="default" className="text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pausado</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        Chat ID: {r.chat_id}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {eventsSummary(r.events)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => handleTest(r)} disabled={isBusy || !r.active}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span className="ml-1 hidden sm:inline">Testar</span>
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span className="ml-1 hidden sm:inline">Eventos</span>
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => handleToggleActive(r)} disabled={isBusy}
                        title={r.active ? "Pausar" : "Ativar"}
                      >
                        {r.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover {r.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esse destinatário não vai mais receber notificações. Você pode adicionar de novo depois.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded: per-event toggles */}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-3 divide-y divide-border">
                      {EVENT_LABELS.map((ev) => (
                        <div key={ev.key} className="flex items-start justify-between gap-4 pt-3 first:pt-0">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{ev.label}</div>
                            <div className="text-xs text-muted-foreground">{ev.description}</div>
                          </div>
                          <Switch
                            checked={r.events[ev.key] !== false}
                            onCheckedChange={(v) => handleEventToggle(r, ev.key, v)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
            Nenhuma notificação enviada ainda. Adicione um destinatário e clique em "Testar".
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
                    {log.recipient_name && (
                      <Badge variant="secondary" className="text-xs">→ {log.recipient_name}</Badge>
                    )}
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