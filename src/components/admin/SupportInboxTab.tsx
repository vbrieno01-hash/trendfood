import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Image as ImageIcon, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Filter = "unread" | "all" | "resolved";

interface ConvRow {
  id: string;
  organization_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_for_admin: number;
  unread_for_store: number;
  resolved_at: string | null;
  org_name?: string;
  org_emoji?: string;
  org_slug?: string;
}

interface Msg {
  id: string;
  conversation_id: string;
  sender: "store" | "admin";
  content: string | null;
  attachment_url: string | null;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const resolveAtt = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const { data } = supabase.storage.from("support-attachments").getPublicUrl(url);
  return data.publicUrl;
};

export default function SupportInboxTab() {
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("unread");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load list
  const loadConvs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_conversations")
      .select(`
        id, organization_id, last_message_at, last_message_preview,
        unread_for_admin, unread_for_store, resolved_at,
        organizations:organization_id ( name, emoji, slug )
      `)
      .order("last_message_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows: ConvRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      organization_id: r.organization_id,
      last_message_at: r.last_message_at,
      last_message_preview: r.last_message_preview,
      unread_for_admin: r.unread_for_admin,
      unread_for_store: r.unread_for_store,
      resolved_at: r.resolved_at,
      org_name: r.organizations?.name,
      org_emoji: r.organizations?.emoji,
      org_slug: r.organizations?.slug,
    }));
    setConvs(rows);
  };

  useEffect(() => {
    loadConvs();
    const ch = supabase
      .channel("admin_support_inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_conversations" },
        () => loadConvs()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (m.conversation_id === activeId) {
            setMessages((prev) =>
              prev.some((x) => x.id === m.id) ? prev : [...prev, m]
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Load messages for active
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    (async () => {
      setLoadingMsgs(true);
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
      setLoadingMsgs(false);
      // mark read
      await supabase.rpc("support_mark_read", { _conversation_id: activeId, _as: "admin" });
    })();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return convs.filter((c) => {
      if (filter === "unread" && c.unread_for_admin === 0) return false;
      if (filter === "resolved" && !c.resolved_at) return false;
      if (filter !== "resolved" && c.resolved_at) return false;
      if (q) {
        const hay = `${c.org_name ?? ""} ${c.org_slug ?? ""} ${c.last_message_preview ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [convs, filter, search]);

  const active = convs.find((c) => c.id === activeId);

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setInput("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_messages").insert({
      conversation_id: activeId,
      sender: "admin",
      sender_user_id: user?.id ?? null,
      content: text,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setInput(text);
    }
  };

  const sendImage = async (file: File) => {
    if (!activeId || !active) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5 MB).");
      return;
    }
    setSending(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${active.organization_id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("support-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: activeId,
        sender: "admin",
        sender_user_id: user?.id ?? null,
        attachment_url: url,
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setSending(false);
    }
  };

  const toggleResolved = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("support_conversations")
      .update({ resolved_at: active.resolved_at ? null : new Date().toISOString() })
      .eq("id", active.id);
    if (error) toast.error(error.message);
    else toast.success(active.resolved_at ? "Reaberta" : "Marcada como resolvida");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">💬 Suporte</h2>
        <p className="text-sm text-muted-foreground">
          Conversas diretas com lojistas. Notificação chega no Telegram a cada mensagem nova.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-[calc(100vh-220px)] min-h-[500px]">
        {/* List */}
        <div className="flex flex-col rounded-xl border bg-card overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar loja ou texto..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="flex gap-1">
              {(["unread", "all", "resolved"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 text-xs py-1.5 rounded-md font-medium transition-colors",
                    filter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                  )}
                >
                  {f === "unread" ? "Não lidas" : f === "all" ? "Todas" : "Resolvidas"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8 px-4">
                Nenhuma conversa por aqui.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors flex flex-col gap-1",
                  activeId === c.id && "bg-muted"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate flex items-center gap-1.5">
                    <span>{c.org_emoji || "🏪"}</span>
                    {c.org_name || c.org_slug || "Loja"}
                  </span>
                  {c.unread_for_admin > 0 && (
                    <Badge className="h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground text-[10px]">
                      {c.unread_for_admin}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.last_message_preview || "—"}
                </p>
                <span className="text-[10px] text-muted-foreground/70">{fmt(c.last_message_at)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="md:col-span-2 flex flex-col rounded-xl border bg-card overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <span>{active.org_emoji || "🏪"}</span>
                    {active.org_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">/{active.org_slug}</span>
                </div>
                <Button size="sm" variant="outline" onClick={toggleResolved}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {active.resolved_at ? "Reabrir" : "Resolver"}
                </Button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 bg-muted/20 flex flex-col gap-2">
                {loadingMsgs && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "admin";
                  const att = resolveAtt(m.attachment_url);
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[75%] flex flex-col gap-1",
                        mine ? "self-end items-end" : "self-start items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-background border rounded-bl-sm"
                        )}
                      >
                        {att && (
                          <a href={att} target="_blank" rel="noreferrer">
                            <img src={att} alt="anexo" className="max-w-[260px] rounded-lg mb-1" loading="lazy" />
                          </a>
                        )}
                        {m.content}
                      </div>
                      <span className="text-[10px] text-muted-foreground px-1">
                        {mine ? "Você" : "Lojista"} · {fmt(m.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t px-3 py-2 bg-background"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) sendImage(f);
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => fileRef.current?.click()}
                  disabled={sending}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Responder..."
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}