-- 1. Dedupe table to prevent spam notifications
CREATE TABLE IF NOT EXISTS public.admin_telegram_dedupe (
  event_key text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_telegram_dedupe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages dedupe"
  ON public.admin_telegram_dedupe
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can view dedupe"
  ON public.admin_telegram_dedupe
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_admin_telegram_dedupe_sent_at
  ON public.admin_telegram_dedupe (sent_at);

-- 2. Update default for admin_telegram_events to include new toggles
ALTER TABLE public.platform_config
  ALTER COLUMN admin_telegram_events SET DEFAULT '{
    "new_signup": true,
    "subscription_change": true,
    "referral_converted": true,
    "critical_error": true,
    "phantom_orders": true,
    "subscription_expiring": true,
    "daily_digest": true,
    "weekly_digest": true,
    "payment_confirmed": true,
    "payment_failed": true,
    "trial_expiring": true,
    "hot_lead": true,
    "cold_store": true
  }'::jsonb;

-- 3. Cleanup function for old dedupe entries (older than 14 days)
CREATE OR REPLACE FUNCTION public.cleanup_admin_telegram_dedupe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_telegram_dedupe
  WHERE sent_at < now() - interval '14 days';
END;
$$;

-- 4. Schedule pg_cron jobs for the watchdog
-- Morning sweep: trials + churn (09:00 BRT = 12:00 UTC)
SELECT cron.unschedule('admin-telegram-watchdog-morning')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admin-telegram-watchdog-morning');

SELECT cron.schedule(
  'admin-telegram-watchdog-morning',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/admin-telegram-watchdog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "morning"}'::jsonb
  );
  $$
);

-- Business hours sweep: hot leads (11h, 15h, 19h BRT = 14h, 18h, 22h UTC)
SELECT cron.unschedule('admin-telegram-watchdog-business')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admin-telegram-watchdog-business');

SELECT cron.schedule(
  'admin-telegram-watchdog-business',
  '0 14,18,22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/admin-telegram-watchdog',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"mode": "business"}'::jsonb
  );
  $$
);

-- Weekly cleanup of dedupe table (Sunday 03:00 UTC)
SELECT cron.unschedule('admin-telegram-dedupe-cleanup')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'admin-telegram-dedupe-cleanup');

SELECT cron.schedule(
  'admin-telegram-dedupe-cleanup',
  '0 3 * * 0',
  $$ SELECT public.cleanup_admin_telegram_dedupe(); $$
);