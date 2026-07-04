
-- 1. Audit log for Telegram bot
CREATE TABLE IF NOT EXISTS public.telegram_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL,
  command TEXT,
  update_type TEXT NOT NULL,
  organization_id UUID,
  affiliate_id UUID,
  rate_limited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.telegram_audit_log TO authenticated;
GRANT ALL ON public.telegram_audit_log TO service_role;
ALTER TABLE public.telegram_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_tg_audit" ON public.telegram_audit_log;
CREATE POLICY "admin_read_tg_audit" ON public.telegram_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tg_audit_chat_time
  ON public.telegram_audit_log(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tg_audit_created
  ON public.telegram_audit_log(created_at DESC);

-- 2. Low-rating alert via reviews trigger
CREATE OR REPLACE FUNCTION public.notify_low_rating_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating IS NOT NULL AND NEW.rating <= 2 THEN
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/notify-merchant-telegram',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'event_type', 'low_rating',
        'rating', NEW.rating,
        'comment', COALESCE(NEW.comment, '')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_low_rating_telegram ON public.reviews;
CREATE TRIGGER trg_low_rating_telegram
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_rating_telegram();
