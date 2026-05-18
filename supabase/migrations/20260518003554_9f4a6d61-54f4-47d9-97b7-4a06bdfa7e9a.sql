
-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_for_admin int NOT NULL DEFAULT 0,
  unread_for_store int NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_conv_last_msg ON public.support_conversations (last_message_at DESC);
CREATE INDEX idx_support_conv_org ON public.support_conversations (organization_id);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('store','admin')),
  sender_user_id uuid,
  content text,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (content IS NOT NULL OR attachment_url IS NOT NULL)
);

CREATE INDEX idx_support_msg_conv_created ON public.support_messages (conversation_id, created_at);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- support_conversations: store owner can SELECT/INSERT/UPDATE its own
CREATE POLICY "store reads its own conversation"
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "store inserts its own conversation"
  ON public.support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "store/admin updates conversation"
  ON public.support_conversations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- support_messages
CREATE POLICY "participants read messages"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      JOIN public.organizations o ON o.id = c.organization_id
      WHERE c.id = conversation_id
        AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "store inserts own message"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'store'
    AND EXISTS (
      SELECT 1 FROM public.support_conversations c
      JOIN public.organizations o ON o.id = c.organization_id
      WHERE c.id = conversation_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "admin inserts admin message"
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender = 'admin' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "participants update read_at"
  ON public.support_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
      JOIN public.organizations o ON o.id = c.organization_id
      WHERE c.id = conversation_id
        AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- ============================================================
-- Trigger: after insert -> update conversation counters & notify
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_support_msg_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _org_name text;
  _preview text;
BEGIN
  _preview := COALESCE(LEFT(NEW.content, 120), '📎 Anexo');

  IF NEW.sender = 'store' THEN
    UPDATE public.support_conversations
       SET last_message_at = NEW.created_at,
           last_message_preview = _preview,
           unread_for_admin = unread_for_admin + 1,
           resolved_at = NULL
     WHERE id = NEW.conversation_id
    RETURNING organization_id INTO _org_id;

    SELECT name INTO _org_name FROM public.organizations WHERE id = _org_id;

    PERFORM public.notify_admin_telegram(
      'support_new_message',
      jsonb_build_object(
        'org_id', _org_id,
        'org_name', _org_name,
        'preview', _preview,
        'has_attachment', NEW.attachment_url IS NOT NULL
      )
    );
  ELSE
    UPDATE public.support_conversations
       SET last_message_at = NEW.created_at,
           last_message_preview = _preview,
           unread_for_store = unread_for_store + 1
     WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_support_msg_after_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_support_msg_after_insert();

-- ============================================================
-- RPC helpers: clear unread counters
-- ============================================================
CREATE OR REPLACE FUNCTION public.support_mark_read(_conversation_id uuid, _as text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _as NOT IN ('store','admin') THEN
    RAISE EXCEPTION 'invalid side';
  END IF;

  IF _as = 'admin' THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    UPDATE public.support_conversations
       SET unread_for_admin = 0
     WHERE id = _conversation_id;
  ELSE
    -- store: must own org
    IF NOT EXISTS (
      SELECT 1 FROM public.support_conversations c
      JOIN public.organizations o ON o.id = c.organization_id
      WHERE c.id = _conversation_id AND o.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    UPDATE public.support_conversations
       SET unread_for_store = 0
     WHERE id = _conversation_id;
  END IF;
END;
$$;

-- ============================================================
-- RPC: get_or_create_conversation for the current logged-in store
-- ============================================================
CREATE OR REPLACE FUNCTION public.support_get_or_create_conversation(_org_id uuid)
RETURNS public.support_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv public.support_conversations;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _conv FROM public.support_conversations WHERE organization_id = _org_id;
  IF NOT FOUND THEN
    INSERT INTO public.support_conversations (organization_id)
    VALUES (_org_id)
    RETURNING * INTO _conv;
  END IF;
  RETURN _conv;
END;
$$;

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- ============================================================
-- Storage bucket: support-attachments (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "support: store reads own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
          AND o.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "support: store uploads own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
          AND o.id::text = (storage.foldername(name))[1]
      )
    )
  );
