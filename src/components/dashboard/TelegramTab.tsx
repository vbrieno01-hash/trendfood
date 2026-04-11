import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessageCircle, CheckCircle2, Bell, Clock, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function TelegramTab({ orgId }: { orgId: string }) {
  const { refreshOrganization } = useAuth();
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from("organizations")
      .select("telegram_chat_id")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTelegramChatId((data as any).telegram_chat_id ?? "");
      });
  }, [orgId]);

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-telegram", {
        body: { chat_id: telegramChatId.trim(), organization_id: orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Mensagem de teste enviada! Verifique o Telegram.");
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar teste");
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ telegram_chat_id: telegramChatId.trim() || null } as any)
        .eq("id", orgId);
      if (error) throw error;
      toast.success("Chat ID do Telegram salvo!");
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
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-sm text-muted-foreground">
                  Envie qualquer mensagem para ele — ele responderá com seu <strong>Chat ID</strong> (um número)
                </p>
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
