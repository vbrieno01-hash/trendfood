-- 1. Tabela de destinatários
CREATE TABLE public.admin_telegram_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  chat_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  events jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_telegram_recipients_active ON public.admin_telegram_recipients(active);

ALTER TABLE public.admin_telegram_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_telegram_recipients_select_admin"
  ON public.admin_telegram_recipients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_telegram_recipients_insert_admin"
  ON public.admin_telegram_recipients FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_telegram_recipients_update_admin"
  ON public.admin_telegram_recipients FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_telegram_recipients_delete_admin"
  ON public.admin_telegram_recipients FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role para a edge function
CREATE POLICY "admin_telegram_recipients_service_all"
  ON public.admin_telegram_recipients FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER trg_admin_telegram_recipients_updated_at
  BEFORE UPDATE ON public.admin_telegram_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Coluna recipient_name no log
ALTER TABLE public.admin_telegram_log
  ADD COLUMN IF NOT EXISTS recipient_name text;

-- 3. Backfill: se houver chat_id antigo, cria 1 destinatário "Principal"
INSERT INTO public.admin_telegram_recipients (name, chat_id, active, events)
SELECT 'Principal', admin_telegram_chat_id, true, COALESCE(admin_telegram_events, '{}'::jsonb)
FROM public.platform_config
WHERE admin_telegram_chat_id IS NOT NULL
  AND admin_telegram_chat_id <> ''
  AND NOT EXISTS (SELECT 1 FROM public.admin_telegram_recipients);