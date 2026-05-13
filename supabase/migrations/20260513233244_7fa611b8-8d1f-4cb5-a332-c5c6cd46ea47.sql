
-- 1) referral_block_logs: registra tentativas bloqueadas pelo trigger
CREATE TABLE IF NOT EXISTS public.referral_block_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_org_id UUID,
  referred_org_id UUID,
  reason TEXT NOT NULL,
  source_payment_id TEXT,
  raw_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_block_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_block_logs_select_admin" ON public.referral_block_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "referral_block_logs_insert_service" ON public.referral_block_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "referral_block_logs_delete_admin" ON public.referral_block_logs
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_referral_block_logs_created
  ON public.referral_block_logs (created_at DESC);

-- 2) cron_health
CREATE TABLE IF NOT EXISTS public.cron_health (
  job_name TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_count INT,
  notes TEXT
);
ALTER TABLE public.cron_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_health_select_admin" ON public.cron_health
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cron_health_all_service" ON public.cron_health
  FOR ALL USING (true) WITH CHECK (true);

-- 3) Trigger de notificação para bônus flagged
CREATE OR REPLACE FUNCTION public.trg_notify_referral_flagged()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.flagged_reason IS NOT NULL THEN
    PERFORM public.notify_admin_telegram(
      'referral_flagged',
      jsonb_build_object(
        'bonus_id', NEW.id,
        'referrer_org_id', NEW.referrer_org_id,
        'referred_org_id', NEW.referred_org_id,
        'referred_org_name', NEW.referred_org_name,
        'bonus_days', NEW.bonus_days,
        'reason', NEW.flagged_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_referral_flagged ON public.referral_bonuses;
CREATE TRIGGER tr_notify_referral_flagged
  AFTER INSERT ON public.referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_referral_flagged();

-- 4) Atualiza release_pending_referral_bonuses para gravar cron_health
CREATE OR REPLACE FUNCTION public.release_pending_referral_bonuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bonus RECORD;
  _current TIMESTAMPTZ;
  _new_expiry TIMESTAMPTZ;
  _count INT := 0;
BEGIN
  FOR _bonus IN
    SELECT id, referrer_org_id, bonus_days
      FROM referral_bonuses
     WHERE applied_at IS NULL
       AND reverted_at IS NULL
       AND released_at IS NOT NULL
       AND released_at <= now()
     ORDER BY released_at
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT trial_ends_at INTO _current
      FROM organizations WHERE id = _bonus.referrer_org_id;

    _current := COALESCE(_current, now());
    IF _current < now() THEN _current := now(); END IF;
    _new_expiry := _current + (_bonus.bonus_days || ' days')::interval;

    UPDATE organizations
       SET trial_ends_at = _new_expiry
     WHERE id = _bonus.referrer_org_id;

    UPDATE referral_bonuses
       SET applied_at = now()
     WHERE id = _bonus.id;

    _count := _count + 1;
  END LOOP;

  INSERT INTO cron_health (job_name, last_success_at, last_run_count)
  VALUES ('release_pending_referral_bonuses', now(), _count)
  ON CONFLICT (job_name) DO UPDATE
    SET last_success_at = EXCLUDED.last_success_at,
        last_run_count  = EXCLUDED.last_run_count;

  RETURN _count;
END;
$$;
