
TRUNCATE TABLE net._http_response;

DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';
DELETE FROM public.ifood_event_log     WHERE received_at < now() - interval '7 days';
DELETE FROM public.fila_impressao      WHERE status = 'impresso' AND created_at < now() - interval '2 days';
DELETE FROM public.client_error_logs   WHERE created_at < now() - interval '30 days';
DELETE FROM public.admin_telegram_log  WHERE created_at < now() - interval '30 days';
DELETE FROM public.cleanup_logs        WHERE created_at < now() - interval '60 days';
DELETE FROM public.telegram_automations_log WHERE sent_at < now() - interval '30 days';
DELETE FROM public.store_version_heartbeat  WHERE last_seen_at < now() - interval '7 days';
DELETE FROM public.whatsapp_outbox      WHERE status IN ('sent','failed') AND created_at < now() - interval '7 days';

CREATE OR REPLACE FUNCTION public.cleanup_infra_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _net int; _cron int; _ifood int; _fila int; _err int;
  _tg int; _cl int; _tgauto int; _hb int; _wa int;
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
  GET DIAGNOSTICS _net = ROW_COUNT;

  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';
  GET DIAGNOSTICS _cron = ROW_COUNT;

  DELETE FROM public.ifood_event_log WHERE received_at < now() - interval '7 days';
  GET DIAGNOSTICS _ifood = ROW_COUNT;

  DELETE FROM public.fila_impressao WHERE status = 'impresso' AND created_at < now() - interval '2 days';
  GET DIAGNOSTICS _fila = ROW_COUNT;

  DELETE FROM public.client_error_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS _err = ROW_COUNT;

  DELETE FROM public.admin_telegram_log WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS _tg = ROW_COUNT;

  DELETE FROM public.cleanup_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS _cl = ROW_COUNT;

  DELETE FROM public.telegram_automations_log WHERE sent_at < now() - interval '30 days';
  GET DIAGNOSTICS _tgauto = ROW_COUNT;

  DELETE FROM public.store_version_heartbeat WHERE last_seen_at < now() - interval '7 days';
  GET DIAGNOSTICS _hb = ROW_COUNT;

  DELETE FROM public.whatsapp_outbox WHERE status IN ('sent','failed') AND created_at < now() - interval '7 days';
  GET DIAGNOSTICS _wa = ROW_COUNT;

  INSERT INTO public.cron_health (job_name, last_success_at, last_run_count)
  VALUES ('cleanup_infra_logs', now(), _net + _cron + _ifood + _fila + _err + _tg + _cl + _tgauto + _hb + _wa)
  ON CONFLICT (job_name) DO UPDATE
    SET last_success_at = EXCLUDED.last_success_at,
        last_run_count  = EXCLUDED.last_run_count;

  RETURN jsonb_build_object(
    'net_http_response', _net,
    'cron_job_run_details', _cron,
    'ifood_event_log', _ifood,
    'fila_impressao', _fila,
    'client_error_logs', _err,
    'admin_telegram_log', _tg,
    'cleanup_logs', _cl,
    'telegram_automations_log', _tgauto,
    'store_version_heartbeat', _hb,
    'whatsapp_outbox', _wa
  );
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-infra-logs-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-infra-logs-daily',
  '30 6 * * *',
  $$ SELECT public.cleanup_infra_logs(); $$
);

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      GREATEST(
        COALESCE(act.last_order_at, 'epoch'::timestamptz),
        COALESCE(act.last_org_created, 'epoch'::timestamptz),
        COALESCE(u.last_sign_in_at, 'epoch'::timestamptz)
      ) AS last_activity_at,
      COALESCE(u.raw_app_meta_data->>'provider', 'email') AS provider,
      COALESCE(o.org_count, 0) AS org_count,
      COALESCE(o.org_names, ARRAY[]::text[]) AS org_names,
      EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') AS is_admin
    FROM auth.users u
    LEFT JOIN (
      SELECT user_id, count(*)::int AS org_count, array_agg(name) AS org_names
      FROM public.organizations
      GROUP BY user_id
    ) o ON o.user_id = u.id
    LEFT JOIN (
      SELECT org.user_id,
             MAX(ord.created_at) AS last_order_at,
             MAX(org.created_at) AS last_org_created
      FROM public.organizations org
      LEFT JOIN public.orders ord ON ord.organization_id = org.id
      GROUP BY org.user_id
    ) act ON act.user_id = u.id
  ) t;

  RETURN _result;
END;
$function$;
