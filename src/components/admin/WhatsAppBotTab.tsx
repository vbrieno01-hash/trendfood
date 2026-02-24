import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Loader2,
  MessageCircle,
  ChevronLeft,
  Bot,
  User,
  Send,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface WhatsAppMessage {
  id: string;
  phone: string;
  incoming_message: string;
  ai_response: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
}

interface ConversationThread {
  phone: string;
  messages: WhatsAppMessage[];
  lastAt: string;
  pendingCount: number;
}

export default function WhatsAppBotTab() {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [testing, setTesting] = useState(false);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("fila_whatsapp")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("Error loading whatsapp messages:", error);
      return;
    }
    setMessages((data as WhatsAppMessage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_whatsapp" },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMessages]);

  // Group by phone
  const threads = useMemo<ConversationThread[]>(() => {
    const map = new Map<string, WhatsAppMessage[]>();
    for (const msg of messages) {
      const existing = map.get(msg.phone) ?? [];
      existing.push(msg);
      map.set(msg.phone, existing);
    }
    return Array.from(map.entries())
      .map(([phone, msgs]) => ({
        phone,
        messages: msgs.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        lastAt: msgs[0].created_at, // msgs are desc from query, first is newest
        pendingCount: msgs.filter((m) => m.status === "pendente").length,
      }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages]);

  const totalPending = useMemo(
    () => messages.filter((m) => m.status === "pendente").length,
    [messages]
  );

  const selectedThread = threads.find((t) => t.phone === selectedPhone);

  // Test webhook
  async function testWebhook() {
    setTesting(true);
    try {
      const fakePhone = "5511999990000";
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: {
              key: { remoteJid: `${fakePhone}@s.whatsapp.net`, fromMe: false },
              message: { conversation: "Oi, quero saber mais sobre o TrendFood!" },
            },
          }),
        }
      );
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      toast.success("Teste enviado! A mensagem deve aparecer em instantes.");
    } catch (e: any) {
      toast.error("Erro ao testar: " + e.message);
    } finally {
      setTesting(false);
    }
  }

  function formatPhone(phone: string) {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    if (phone.length === 11) {
      return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
    }
    return phone;
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ── Conversation List ──
  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Conversas</h3>
            {totalPending > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 text-xs">
                {totalPending} pendente{totalPending > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={loadMessages}
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={testWebhook}
          disabled={testing}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Testar Webhook
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Teste o webhook ou aguarde mensagens reais
            </p>
          </div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.phone}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                selectedPhone === thread.phone
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-secondary text-foreground"
              }`}
              onClick={() => {
                setSelectedPhone(thread.phone);
                if (isMobile) setShowList(false);
              }}
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block truncate font-medium">{formatPhone(thread.phone)}</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {thread.messages[thread.messages.length - 1]?.incoming_message}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(thread.lastAt)}
                </span>
                {thread.pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {thread.pendingCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Chat Area ──
  const ChatArea = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        {isMobile && (
          <button onClick={() => setShowList(true)} className="p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {selectedPhone ? formatPhone(selectedPhone) : "Selecione uma conversa"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedThread
              ? `${selectedThread.messages.length} mensage${selectedThread.messages.length > 1 ? "ns" : "m"}`
              : "WhatsApp Bot"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedPhone ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">WhatsApp Bot Monitor</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Selecione uma conversa para ver as mensagens recebidas e respostas da IA.
            </p>
          </div>
        ) : !selectedThread || selectedThread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem nesta conversa</p>
          </div>
        ) : (
          selectedThread.messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {/* Incoming message */}
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-secondary text-foreground px-4 py-3 text-sm leading-relaxed">
                  <p className="whitespace-pre-wrap">{msg.incoming_message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>

              {/* AI Response */}
              {msg.ai_response && (
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap">{msg.ai_response}</p>
                    <div className="flex items-center gap-1.5 mt-1 justify-end">
                      {msg.status === "pendente" ? (
                        <Clock className="w-3 h-3 text-primary-foreground/60" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-primary-foreground/60" />
                      )}
                      <span className="text-[10px] text-primary-foreground/60">
                        {msg.status === "pendente" ? "Aguardando envio" : "Enviado"}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // ── Layout ──
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-120px)] bg-card rounded-xl border border-border overflow-hidden">
        {showList ? <ConversationList /> : <ChatArea />}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] bg-card rounded-xl border border-border overflow-hidden flex">
      <div className="w-80 border-r border-border shrink-0">
        <ConversationList />
      </div>
      <div className="flex-1">
        <ChatArea />
      </div>
    </div>
  );
}
