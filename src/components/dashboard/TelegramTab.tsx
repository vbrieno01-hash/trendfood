import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessageCircle, CheckCircle2, Bell, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

function explainTelegramError(rawError: string, botRef: string): string {
  const err = (rawError || "").toLowerCase();
  if (err.includes("chat not found")) {
    return `Você ainda não iniciou o ${botRef}. Abra o ${botRef} no Telegram e envie /start, depois teste novamente. Iniciar o /start no @userinfobot só serve para descobrir seu Chat ID — cada bot exige um /start próprio.`;
  }
  if (err.includes("bot was blocked") || err.includes("blocked by the user")) {
    return `Você bloqueou o ${botRef}. Desbloqueie o bot no Telegram e tente novamente.`;
  }
  if (err.includes("user is deactivated")) {
    return "Esta conta de Telegram foi desativada. Use outro Chat ID.";
  }
  if (err.includes("unauthorized") || err.includes("invalid token")) {
    return "Erro de configuração da plataforma. Avise o suporte.";
  }
  if (err.includes("chat_id is empty") || err.includes("invalid chat_id")) {
    return "Chat ID inválido. Verifique se copiou o número corretamente do @userinfobot.";
  }
  return rawError || "Falha ao enviar teste";
}

export default function TelegramTab({ orgId }: { orgId: string }) {
  const { refreshOrganization } = useAuth();
  const [telegramChatId, setTelegramChatId] = useState("");
  const [originalChatId, setOriginalChatId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [botUsername, setBotUsername] = useState<string>("");

  useEffect(() => {
    // Busca username real do bot da plataforma
    supabase.functions
      .invoke("test-telegram", { body: { action: "bot_info" } })
      .then(({ data }) => {
        if (data?.ok && data?.username) setBotUsername(data.username);
      })
      .catch(() => {});
  }, []);

  const botRef = botUsername ? `@${botUsername}` : "bot da plataforma";

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("organizations")
      .select("telegram_chat_id, name")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const cid = (data as any).telegram_chat_id ?? "";
          setTelegramChatId(cid);
          setOriginalChatId(cid);
          setStoreName((data as any).name ?? "");
        }
      });
  }, [orgId]);

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-telegram", {
        body: { chat_id: telegramChatId.trim(), organization_id: orgId },
      });
      if (error) throw error;
      if (data?.ok === false) {
        const tgError = data?.telegram_error || data?.error || "Falha ao enviar teste";
        toast.error(explainTelegramError(tgError, botRef), { duration: 12000 });
        return;
      }
      toast.success("Mensagem de teste enviada! Verifique o Telegram.");
    } catch (err: any) {
      toast.error(explainTelegramError(err?.message || "", botRef), { duration: 12000 });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const newChatId = telegramChatId.trim();
      const { error } = await supabase
        .from("organizations")
        .update({ telegram_chat_id: newChatId || null } as any)
        .eq("id", orgId);
      if (error) throw error;

      // Send welcome message automatically when Chat ID is new or changed
      const isNewOrChanged = newChatId && newChatId !== originalChatId;
      if (isNewOrChanged) {
        const { data: welcomeData, error: welcomeErr } = await supabase.functions.invoke(
          "test-telegram",
          { body: { action: "welcome_merchant", chat_id: newChatId, store_name: storeName } },
        );
        if (welcomeErr || (welcomeData as any)?.ok === false) {
          const tgError = (welcomeData as any)?.telegram_error || (welcomeData as any)?.error || welcomeErr?.message || "";
          toast.warning(
            `Chat ID salvo, mas boas-vindas falhou: ${explainTelegramError(tgError, botRef)}`,
            { duration: 12000 },
          );
        } else {
          toast.success("Chat ID salvo! Mensagem de boas-vindas enviada pro Telegram 📱");
        }
        setOriginalChatId(newChatId);
      } else {
        toast.success("Chat ID do Telegram salvo!");
      }
      refreshOrganization?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero / Explicação */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/30 flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">Telegram</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            Receba <strong>notificações instantâneas</strong> de novos pedidos diretamente no Telegram.
            Funciona como um complemento às notificações push — sempre que um cliente fizer um pedido,
            você recebe uma mensagem no Telegram com o número do pedido.
          </p>
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">Como configurar</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-sm text-muted-foreground">
                  Abra o Telegram e procure o bot{" "}
                  <a href="https://t.me/userinfobot" target="_blank" rel="noopener" className="underline text-primary font-medium">@userinfobot</a>
                  {" "}— envie qualquer mensagem e ele responderá com seu <strong>Chat ID</strong> (um número)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center">2</span>
                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Abra o {botUsername ? (
                      <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener" className="underline text-primary">@{botUsername}</a>
                    ) : "bot da plataforma"} e envie <code className="px-1.5 py-0.5 rounded bg-muted text-xs">/start</code></strong> — passo obrigatório
                  </p>
                  <p className="text-xs mt-1 opacity-80">
                    Sem esse <code>/start</code>, o Telegram bloqueia nosso bot de te enviar mensagens (erro <em>chat not found</em>).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-sm text-muted-foreground">
                  Cole o Chat ID no campo abaixo, teste e salve
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuração */}
      <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/30 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Configuração</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <Label htmlFor="telegram-chat-id" className="text-sm font-medium">Chat ID do Telegram</Label>
            <Input
              id="telegram-chat-id"
              placeholder="Ex: 123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!telegramChatId.trim() || testLoading}
              onClick={handleTest}
              className="h-9"
            >
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Testar
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleSave}
              className="h-9"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Salvar
            </Button>
          </div>
          {telegramChatId.trim() && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Chat ID configurado. Você receberá notificações de novos pedidos no Telegram.
            </p>
          )}
        </div>
      </div>

      {/* Automações */}
      {telegramChatId.trim() && (
        <div className="dashboard-glass rounded-2xl overflow-hidden animate-dashboard-fade-in">
          <div className="px-5 py-4 border-b border-border/40 bg-muted/30 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70">Automações Ativas</p>
          </div>
          <div className="px-5 py-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Com o Chat ID configurado, você recebe automaticamente:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Resumo diário às 23h</p>
                  <p className="text-xs text-muted-foreground">Total de pedidos, faturamento, ticket médio e produto mais vendido</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Resumo semanal aos domingos</p>
                  <p className="text-xs text-muted-foreground">Mesmos dados + comparativo com a semana anterior</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Aviso de abertura</p>
                  <p className="text-xs text-muted-foreground">Mensagem quando a loja abre conforme o horário configurado</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Aviso de fechamento</p>
                  <p className="text-xs text-muted-foreground">10 minutos antes do horário de fechar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
