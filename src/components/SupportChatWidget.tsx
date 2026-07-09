// Reclame Aqui — widget flutuante one-way. Envia bugs/sugestões/reclamações direto
// pro Telegram do dono da plataforma. Sem histórico, sem thread, sem realtime.
import { useState, useRef, useEffect } from "react";
import { MessageCircleWarning, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MIN_INTERVAL_MS = 30_000;
const SESSION_LIMIT = 5;
const APP_VERSION = "trendfood-web";

type Category = "bug" | "suggestion" | "complaint" | "other";
const CATEGORIES: { value: Category; label: string; hint: string }[] = [
  { value: "bug", label: "🐛 Erro/Bug", hint: "Alguma coisa quebrou ou travou" },
  { value: "suggestion", label: "💡 Sugestão", hint: "Ideia pra melhorar o app" },
  { value: "complaint", label: "😠 Reclamação", hint: "Algo tá te incomodando" },
  { value: "other", label: "💬 Outro", hint: "Qualquer outra coisa" },
];

const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");

const ReclameAquiWidget = () => {
  const { organization, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [includeTechContext, setIncludeTechContext] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentAtRef = useRef<number>(0);
  const sentCountRef = useRef<number>(0);

  // Pré-preenche com dados da sessão
  useEffect(() => {
    if (!name && (user as any)?.email) {
      const meta = (user as any)?.user_metadata || {};
      setName(meta.full_name || meta.name || (user as any).email.split("@")[0] || "");
    }
  }, [user, name]);

  // Foca textarea ao abrir
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const cleanName = stripTags(name).trim();
    const cleanMessage = stripTags(message).trim();
    const cleanContact = stripTags(contact).trim();

    if (cleanName.length < 2) {
      toast.error("Informe seu nome (mín. 2 letras).");
      return;
    }
    if (cleanMessage.length < 5) {
      toast.error("Mensagem muito curta (mín. 5 caracteres).");
      return;
    }
    if (cleanMessage.length > 2000) {
      toast.error("Mensagem muito longa (máx. 2000 caracteres).");
      return;
    }

    // Rate-limit client
    const now = Date.now();
    if (now - lastSentAtRef.current < MIN_INTERVAL_MS) {
      const wait = Math.ceil((MIN_INTERVAL_MS - (now - lastSentAtRef.current)) / 1000);
      toast.error(`Aguarde ${wait}s antes de enviar outra.`);
      return;
    }
    if (sentCountRef.current >= SESSION_LIMIT) {
      toast.error("Limite de envios atingido nesta sessão.");
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        category,
        name: cleanName,
        contact: cleanContact,
        message: cleanMessage,
        org_id: organization?.id ?? null,
        org_name: organization?.name ?? null,
        org_slug: (organization as any)?.slug ?? null,
      };
      if (includeTechContext) {
        payload.page_url = typeof window !== "undefined" ? window.location.pathname + window.location.search : null;
        payload.user_agent = typeof navigator !== "undefined" ? navigator.userAgent : null;
        payload.app_version = APP_VERSION;
      }

      const { data, error } = await supabase.functions.invoke("reclame-aqui-send", { body: payload });
      if (error) throw error;
      if ((data as any)?.ok === false) throw new Error((data as any)?.error || "erro_desconhecido");

      lastSentAtRef.current = now;
      sentCountRef.current += 1;
      toast.success("Recebido! O dono da plataforma foi avisado. 🙌");
      setMessage("");
      setOpen(false);
    } catch (err: any) {
      const raw = String(err?.message || err || "");
      if (raw.includes("rate_limited") || raw.includes("429")) {
        toast.error("Muitos envios recentes. Tente novamente em alguns minutos.");
      } else {
        toast.error("Não foi possível enviar. Tente novamente.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 lg:bottom-5 right-5 z-[9999] group flex items-center gap-2 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-white shadow-lg shadow-orange-500/40 transition-transform hover:scale-105 active:scale-95"
          aria-label="Abrir Reclame Aqui"
        >
          <MessageCircleWarning className="h-5 w-5" />
          <span className="text-sm font-semibold pr-1 hidden sm:inline">Reclame Aqui</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-400" />
          </span>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-[9999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border bg-background shadow-2xl sm:w-[420px] animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircleWarning className="h-5 w-5" />
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm">Reclame Aqui</span>
                <span className="text-[11px] opacity-90">Sua mensagem chega direto no dono</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
            {/* Categoria */}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium text-left transition-colors",
                    category === c.value
                      ? "border-orange-500 bg-orange-500/10 text-foreground"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div>{c.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.hint}</div>
                </button>
              ))}
            </div>

            {/* Nome + contato */}
            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={80}
                required
                disabled={sending}
                className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="WhatsApp ou e-mail (opcional)"
                maxLength={120}
                disabled={sending}
                className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-orange-500"
              />
            </div>

            {/* Mensagem */}
            <div className="flex flex-col gap-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o problema, a sugestão ou a reclamação..."
                rows={5}
                maxLength={2000}
                required
                disabled={sending}
                className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-orange-500 resize-none"
              />
              <span className="text-[10px] text-muted-foreground self-end">
                {message.length}/2000
              </span>
            </div>

            {/* Contexto técnico */}
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={includeTechContext}
                onChange={(e) => setIncludeTechContext(e.target.checked)}
                className="rounded border-border"
                disabled={sending}
              />
              Anexar contexto técnico (URL, navegador, versão do app)
            </label>

            {/* Ações */}
            <button
              type="submit"
              disabled={sending || message.trim().length < 5 || name.trim().length < 2}
              className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/30 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar para o dono
                </>
              )}
            </button>

            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Sua mensagem chega direto no Telegram do dono da plataforma. Não abre chat aqui — se quiser retorno, deixe seu contato acima.
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default ReclameAquiWidget;