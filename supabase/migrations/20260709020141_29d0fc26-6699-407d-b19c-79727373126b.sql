
CREATE TABLE IF NOT EXISTS public.reclame_aqui_ratelimit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.reclame_aqui_ratelimit TO service_role;

ALTER TABLE public.reclame_aqui_ratelimit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reclame_aqui_ratelimit_service_all"
  ON public.reclame_aqui_ratelimit
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS reclame_aqui_ratelimit_ip_idx
  ON public.reclame_aqui_ratelimit (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS reclame_aqui_ratelimit_org_idx
  ON public.reclame_aqui_ratelimit (org_id, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('reclame_aqui_ratelimit_cleanup')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='reclame_aqui_ratelimit_cleanup');
    PERFORM cron.schedule(
      'reclame_aqui_ratelimit_cleanup',
      '17 * * * *',
      $cron$DELETE FROM public.reclame_aqui_ratelimit WHERE created_at < now() - interval '24 hours'$cron$
    );
  END IF;
END $$;
