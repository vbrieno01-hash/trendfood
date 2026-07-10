
-- 1) Coluna processing_started_at
ALTER TABLE public.whatsapp_outbox
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wa_outbox_processing_started
  ON public.whatsapp_outbox (processing_started_at)
  WHERE status = 'processing';

-- 2) Trigger de dedupe (janela 5min)
-- Bloqueia inserts com msg idêntica pra mesmo phone/org que já esteja pending/processing/sent recente.
CREATE OR REPLACE FUNCTION public.wa_outbox_dedup_recent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.whatsapp_outbox
    WHERE organization_id = NEW.organization_id
      AND phone = NEW.phone
      AND md5(message) = md5(NEW.message)
      AND status IN ('pending','processing','sent')
      AND created_at > (now() - interval '5 minutes')
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'duplicate_message_within_5min'
      USING ERRCODE = 'unique_violation',
            HINT = 'Mensagem idêntica pra este número enfileirada/enviada nos últimos 5 minutos.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_outbox_dedup ON public.whatsapp_outbox;
CREATE TRIGGER trg_wa_outbox_dedup
  BEFORE INSERT ON public.whatsapp_outbox
  FOR EACH ROW EXECUTE FUNCTION public.wa_outbox_dedup_recent();

-- 3) Claim atômico com SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_outbox_batch(_limit int DEFAULT 15, _max_attempts int DEFAULT 3)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  phone text,
  message text,
  attempts int,
  event_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
    FROM public.whatsapp_outbox o
    WHERE o.status = 'pending'
      AND o.attempts < _max_attempts
    ORDER BY o.created_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.whatsapp_outbox w
    SET status = 'processing',
        attempts = w.attempts + 1,
        processing_started_at = now()
    FROM claimed c
    WHERE w.id = c.id
    RETURNING w.id, w.organization_id, w.phone, w.message, w.attempts, w.event_type;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_outbox_batch(int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox_batch(int, int) TO service_role;
