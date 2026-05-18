import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender: "store" | "admin";
  sender_user_id: string | null;
  content: string | null;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  organization_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_for_admin: number;
  unread_for_store: number;
  resolved_at: string | null;
  created_at: string;
}

/** Hook usado pelo widget do lojista. Garante 1 conversa, escuta realtime, envia msg + foto. */
export function useSupportChat(orgId: string | undefined | null) {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // boot
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: conv, error } = await supabase.rpc("support_get_or_create_conversation", {
        _org_id: orgId,
      });
      if (cancelled) return;
      if (error || !conv) {
        setLoading(false);
        return;
      }
      setConversation(conv as SupportConversation);
      const { data: msgs } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", (conv as SupportConversation).id)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((msgs ?? []) as SupportMessage[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // realtime
  useEffect(() => {
    if (!conversation?.id) return;
    const ch = supabase
      .channel(`support_msg_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as SupportMessage).id)) return prev;
            return [...prev, payload.new as SupportMessage];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_conversations",
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => setConversation(payload.new as SupportConversation)
      )
      .subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [conversation?.id]);

  const sendText = useCallback(
    async (text: string) => {
      if (!conversation || !text.trim()) return;
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: conversation.id,
        sender: "store",
        sender_user_id: user?.id ?? null,
        content: text.trim(),
      });
      setSending(false);
      if (error) throw error;
    },
    [conversation]
  );

  const sendImage = useCallback(
    async (file: File) => {
      if (!conversation || !orgId) return;
      setSending(true);
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("support-attachments")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        const url = signed?.signedUrl ?? path;
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("support_messages").insert({
          conversation_id: conversation.id,
          sender: "store",
          sender_user_id: user?.id ?? null,
          attachment_url: url,
        });
        if (error) throw error;
      } finally {
        setSending(false);
      }
    },
    [conversation, orgId]
  );

  const markRead = useCallback(async () => {
    if (!conversation) return;
    await supabase.rpc("support_mark_read", { _conversation_id: conversation.id, _as: "store" });
  }, [conversation]);

  return { conversation, messages, loading, sending, sendText, sendImage, markRead };
}

/** Helper de horário oficial de atendimento (08–22 BRT). Não bloqueia envio. */
export function isSupportOnline(now: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  const h = parseInt(fmt.format(now), 10);
  return h >= 8 && h < 22;
}