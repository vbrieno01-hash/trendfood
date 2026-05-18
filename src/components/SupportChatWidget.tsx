import { useState, useRef, useEffect } from "react";
import { HeadphonesIcon, X, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSupportChat, isSupportOnline } from "@/hooks/useSupportChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "";
  }
};

const SupportChatWidget = () => {
  const { organization } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState(isSupportOnline());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { conversation, messages, loading, sending, sendText, sendImage, markRead } =
    useSupportChat(organization?.id);

  // tick a cada minuto pra atualizar badge online/offline
  useEffect(() => {
    const id = setInterval(() => setOnline(isSupportOnline()), 60_000);
    return () => clearInterval(id);
  }, []);

  // autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // marcar lida ao abrir + focar input
  useEffect(() => {
    if (open) {
      markRead();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, markRead]);

  if (!organization) return null;

  const unread = conversation?.unread_for_store ?? 0;

  const handleSendText = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    try {
      await sendText(text);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
      setInput(text);
    }
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5 MB).");
      return;
    }
    try {
      await sendImage(file);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    }
  };

  // Resolve URL para imagens (algumas podem ser apenas o path).
  const resolveAttachment = (url: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const { data } = supabase.storage.from("support-attachments").getPublicUrl(url);
    return data.publicUrl;
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 lg:bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label="Abrir chat de suporte"
        >
          <HeadphonesIcon className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <span
            className={cn(
              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
              online ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl sm:w-[400px] animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5" />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm">Suporte TrendFood</span>
                <span className="text-[11px] opacity-90 flex items-center gap-1">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      online ? "bg-emerald-300" : "bg-amber-300"
                    )}
                  />
                  {online ? "Online agora" : "Atendimento 08h–22h"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-primary-foreground/20 transition-colors"
              aria-label="Fechar chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Off-hours notice */}
          {!online && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
              Fora do horário oficial (08h–22h). Pode mandar mesmo assim que respondo assim que vir 🙂
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-col gap-2 overflow-y-auto px-4 py-3 h-[380px] sm:h-[420px] bg-muted/20"
          >
            {loading && messages.length === 0 && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 px-2 leading-relaxed">
                Mande sua dúvida, sugestão ou problema. Pode anexar fotos também 📎
              </div>
            )}
            {messages.map((msg) => {
              const mine = msg.sender === "store";
              const att = resolveAttachment(msg.attachment_url);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] flex flex-col gap-1",
                    mine ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border rounded-bl-sm"
                    )}
                  >
                    {att && (
                      <a href={att} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={att}
                          alt="anexo"
                          className="max-w-[220px] rounded-lg mb-1"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {mine ? "Você" : "Suporte"} · {formatTime(msg.created_at)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex items-center gap-2 border-t px-3 py-2 bg-background rounded-b-2xl"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40"
              aria-label="Anexar foto"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;