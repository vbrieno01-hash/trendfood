
CREATE OR REPLACE FUNCTION public.get_internal_logs_sizes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_http bigint := 0;
  v_cron bigint := 0;
  v_last timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  BEGIN v_http := pg_total_relation_size('net._http_response'); EXCEPTION WHEN OTHERS THEN v_http := 0; END;
  BEGIN v_cron := pg_total_relation_size('cron.job_run_details'); EXCEPTION WHEN OTHERS THEN v_cron := 0; END;
  SELECT last_success_at INTO v_last FROM public.cron_health WHERE job_name = 'cleanup-internal-postgres-logs';
  RETURN jsonb_build_object(
    'http_size', v_http,
    'cron_size', v_cron,
    'total_size', v_http + v_cron,
    'last_run_at', v_last
  );
END;
$$;
