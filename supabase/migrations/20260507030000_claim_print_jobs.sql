-- Atomic claim of print jobs to prevent duplicate prints when multiple
-- robot pollers / tabs read the same pending job before it's marked printed.
-- Bluetooth flow is NOT affected (does not use this RPC).

ALTER TABLE public.fila_impressao
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_print_jobs(_org_id uuid)
RETURNS SETOF public.fila_impressao
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.fila_impressao
  SET status = 'imprimindo', claimed_at = now()
  WHERE id IN (
    SELECT id FROM public.fila_impressao
    WHERE organization_id = _org_id AND status = 'pendente'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 50
  )
  RETURNING *;
$$;

-- Watchdog: if robot crashes mid-print, return job to the queue after 60s
SELECT cron.unschedule('reclaim-stuck-prints')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reclaim-stuck-prints');

SELECT cron.schedule(
  'reclaim-stuck-prints',
  '* * * * *',
  $$UPDATE public.fila_impressao
    SET status = 'pendente', claimed_at = NULL
    WHERE status = 'imprimindo'
      AND claimed_at < now() - interval '60 seconds'$$
);
