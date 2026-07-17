CREATE OR REPLACE FUNCTION public.cleanup_infra_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _net int; _cron int; _ifood int; _fila int; _err int;
  _tg int; _cl int; _tgauto int; _hb int; _wa int;
  _filawa int; _dedupe int; _aimetrics int;
BEGIN
  DELETE FROM net._http_response WHERE created < now() - interval '1 day';
  GET DIAGNOSTICS _net = ROW_COUNT;

  DELETE FROM cron.job_run_details WHERE start_time < now() - interval '3 days';
  GET DIAGNOSTICS _cron = ROW_COUNT;

  DELETE FROM public.ifood_event_log WHERE received_at < now() - interval '3 days';
  GET DIAGNOSTICS _ifood = ROW_COUNT;

  DELETE FROM public.fila_impressao WHERE status = 'impresso' AND created_at < now() - interval '2 days';
  GET DIAGNOSTICS _fila = ROW_COUNT;

  DELETE FROM public.client_error_logs WHERE created_at < now() - interval '14 days';
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

  DELETE FROM public.fila_whatsapp WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS _filawa = ROW_COUNT;

  DELETE FROM public.wa_message_dedupe WHERE created_at < now() - interval '1 day';
  GET DIAGNOSTICS _dedupe = ROW_COUNT;

  DELETE FROM public.ai_bot_metrics WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS _aimetrics = ROW_COUNT;

  INSERT INTO public.cron_health (job_name, last_success_at, last_run_count)
  VALUES ('cleanup_infra_logs', now(),
          _net + _cron + _ifood + _fila + _err + _tg + _cl + _tgauto + _hb + _wa + _filawa + _dedupe + _aimetrics)
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
    'whatsapp_outbox', _wa,
    'fila_whatsapp', _filawa,
    'wa_message_dedupe', _dedupe,
    'ai_bot_metrics', _aimetrics
  );
END;
$function$;