import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Send,
  Copy,
  Check,
  Trash2,
  Pencil,
  Loader2,
  MessageCircle,
  ChevronLeft,
  Bot,
  User,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chat`;

export default function SalesChatTab() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [showList, setShowList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from("sales_conversations" as any)
      .select("*")
      .order("updated_at", { ascending: false });
    setConversations((data as any as Conversation[]) ?? []);
    setLoadingConvs(false);
  }

  // Load messages when active conv changes
  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    loadMessages(activeConvId);
  }, [activeConvId]);

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from("sales_messages" as any)
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as any as Message[]) ?? []);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function createConversation() {
    if (!user) return;
    const title = `Conversa ${conversations.length + 1}`;
    const { data, error } = await supabase
      .from("sales_conversations" as any)
      .insert({ admin_user_id: user.id, title } as any)
      .select()
      .single();
    if (error) { toast.error("Erro ao criar conversa"); return; }
    const conv = data as any as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    if (isMobile) setShowList(false);
  }

  async function deleteConversation(id: string) {
    await supabase.from("sales_conversations" as any).delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
  }

  async function renameConversation(id: string) {
    if (!editTitle.trim()) return;
    await supabase
      .from("sales_conversations" as any)
      .update({ title: editTitle.trim() } as any)
      .eq("id", id);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
    );
    setEditingId(null);
  }

  const copyToClipboard = useCallback(async (text: string, msgId?: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId ?? null);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  async function sendMessage() {
    if (!input.trim() || !activeConvId || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    await supabase
      .from("sales_messages" as any)
      .insert({
        conversation_id: activeConvId,
        role: "user",
        content: userMsg.content,
      } as any);

    // Stream AI response
    let assistantContent = "";
    try {
      const allMsgs = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMsgs }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !last.id) {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 && m.role === "assistant"
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {}
        }
      }

      // Save assistant message to DB
      if (assistantContent) {
        await supabase
          .from("sales_messages" as any)
          .insert({
            conversation_id: activeConvId,
            role: "assistant",
            content: assistantContent,
          } as any);
      }
    } catch (e: any) {
      console.error("Stream error:", e);
      toast.error(e.message || "Erro ao gerar resposta");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // ── Conversation List ──
  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Button onClick={createConversation} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" /> Nova Conversa
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loadingConvs ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Crie uma conversa para começar a vender
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                activeConvId === conv.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "hover:bg-secondary text-foreground"
              }`}
              onClick={() => {
                setActiveConvId(conv.id);
                if (isMobile) setShowList(false);
              }}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              {editingId === conv.id ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => renameConversation(conv.id)}
                  onKeyDown={(e) => e.key === "Enter" && renameConversation(conv.id)}
                  className="h-7 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 truncate">{conv.title}</span>
              )}
              <div className="hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(conv.id);
                    setEditTitle(conv.title);
                  }}
                  className="p-1 rounded hover:bg-secondary"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
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
        <Bot className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {activeConv?.title || "Assistente de Vendas"}
          </h3>
          <p className="text-xs text-muted-foreground">IA estrategista TrendFood</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeConvId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="w-12 h-12 text-primary/30 mb-4" />
            <h3 className="font-semibold text-foreground mb-1">Assistente de Vendas IA</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie uma conversa e cole o que o cliente falou. A IA vai gerar respostas profissionais
              pra você copiar e enviar no WhatsApp.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Digite o que o cliente falou e a IA vai te ajudar a responder
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => copyToClipboard(msg.content, `msg-${i}`)}
                    className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-card border border-border shadow-sm hover:bg-secondary transition-colors"
                    title="Copiar resposta"
                  >
                    {copiedId === `msg-${i}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {activeConvId && (
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cole o que o cliente falou..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl border border-border bg-card overflow-hidden">
      {/* Conversation list */}
      {(!isMobile || showList) && (
        <div className={`${isMobile ? "w-full" : "w-72 border-r border-border"} shrink-0`}>
          <ConversationList />
        </div>
      )}
      {/* Chat */}
      {(!isMobile || !showList) && (
        <div className="flex-1 min-w-0">
          <ChatArea />
        </div>
      )}
    </div>
  );
}
