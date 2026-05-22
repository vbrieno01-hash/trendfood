
-- Expande check constraint
ALTER TABLE public.cleanup_logs DROP CONSTRAINT IF EXISTS cleanup_logs_kind_check;
ALTER TABLE public.cleanup_logs ADD CONSTRAINT cleanup_logs_kind_check
  CHECK (kind = ANY (ARRAY[
    'orphan_image','inactive_org_warned','inactive_org_deleted','orphan_user_deleted',
    'internal_postgres_logs'
  ]));

-- PK em cron_health
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cron_health'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.cron_health ADD PRIMARY KEY (job_name);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_internal_postgres_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, cron
AS $$
DECLARE
  v_http_deleted bigint := 0;
  v_cron_deleted bigint := 0;
  v_http_size_before bigint := 0;
  v_http_size_after bigint := 0;
  v_cron_size_before bigint := 0;
  v_cron_size_after bigint := 0;
BEGIN
  BEGIN v_http_size_before := pg_total_relation_size('net._http_response');
  EXCEPTION WHEN OTHERS THEN v_http_size_before := 0; END;
  BEGIN v_cron_size_before := pg_total_relation_size('cron.job_run_details');
  EXCEPTION WHEN OTHERS THEN v_cron_size_before := 0; END;

  BEGIN
    DELETE FROM net._http_response WHERE created < now() - interval '2 days';
    GET DIAGNOSTICS v_http_deleted = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN v_http_deleted := -1; END;

  BEGIN
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';
    GET DIAGNOSTICS v_cron_deleted = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN v_cron_deleted := -1; END;

  BEGIN v_http_size_after := pg_total_relation_size('net._http_response');
  EXCEPTION WHEN OTHERS THEN v_http_size_after := 0; END;
  BEGIN v_cron_size_after := pg_total_relation_size('cron.job_run_details');
  EXCEPTION WHEN OTHERS THEN v_cron_size_after := 0; END;

  INSERT INTO public.cleanup_logs (kind, target, size_bytes, dry_run, reason, metadata)
  VALUES (
    'internal_postgres_logs',
    'net._http_response + cron.job_run_details',
    (v_http_size_before - v_http_size_after) + (v_cron_size_before - v_cron_size_after),
    false,
    'scheduled cleanup of internal postgres logs',
    jsonb_build_object(
      'http_deleted', v_http_deleted,
      'cron_deleted', v_cron_deleted,
      'http_size_before', v_http_size_before,
      'http_size_after', v_http_size_after,
      'cron_size_before', v_cron_size_before,
      'cron_size_after', v_cron_size_after
    )
  );

  INSERT INTO public.cron_health (job_name, last_success_at, last_run_count, notes)
  VALUES (
    'cleanup-internal-postgres-logs',
    now(),
    (COALESCE(v_http_deleted,0) + COALESCE(v_cron_deleted,0))::int,
    format('http=%s cron=%s', v_http_deleted, v_cron_deleted)
  )
  ON CONFLICT (job_name) DO UPDATE SET
    last_success_at = EXCLUDED.last_success_at,
    last_run_count = EXCLUDED.last_run_count,
    notes = EXCLUDED.notes;

  RETURN jsonb_build_object(
    'http_deleted', v_http_deleted,
    'cron_deleted', v_cron_deleted,
    'http_freed_bytes', v_http_size_before - v_http_size_after,
    'cron_freed_bytes', v_cron_size_before - v_cron_size_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.run_cleanup_internal_logs_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem executar essa função';
  END IF;
  RETURN public.cleanup_internal_postgres_logs();
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-internal-postgres-logs');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-internal-postgres-logs',
  '30 6 * * *',
  $$SELECT public.cleanup_internal_postgres_logs();$$
);

SELECT public.cleanup_internal_postgres_logs();
