
CREATE OR REPLACE FUNCTION public.storage_maintenance_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  v_start timestamptz := clock_timestamp();
  v_deleted bigint;
  v_total bigint := 0;
  v_report jsonb := '{}'::jsonb;
  v_step_start timestamptz;

  -- helper macro pattern via sub-blocks
BEGIN
  -- 1) net._http_response > 24h
  BEGIN
    v_step_start := clock_timestamp();
    DELETE FROM net._http_response WHERE created < now() - interval '24 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('net._http_response', v_deleted);
    INSERT INTO public.cleanup_logs(kind, target, reason, metadata)
      VALUES ('auto_ttl','net._http_response','>24h',
              jsonb_build_object('rows_deleted', v_deleted,
                                 'duration_ms', extract(millisecond from clock_timestamp()-v_step_start)));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind, target, reason, metadata)
      VALUES ('auto_ttl_error','net._http_response','error',
              jsonb_build_object('error', SQLERRM));
  END;

  -- 2) fila_impressao processed > 7d
  BEGIN
    v_step_start := clock_timestamp();
    DELETE FROM public.fila_impressao
      WHERE status IN ('impresso','erro','cancelado')
        AND created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('fila_impressao', v_deleted);
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata)
      VALUES ('auto_ttl','fila_impressao','processed>7d',
              jsonb_build_object('rows_deleted',v_deleted,'duration_ms',extract(millisecond from clock_timestamp()-v_step_start)));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata)
      VALUES ('auto_ttl_error','fila_impressao','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 3) fila_whatsapp sent > 7d
  BEGIN
    v_step_start := clock_timestamp();
    DELETE FROM public.fila_whatsapp
      WHERE status IN ('enviado','erro','cancelado','sent','failed')
        AND created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('fila_whatsapp', v_deleted);
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata)
      VALUES ('auto_ttl','fila_whatsapp','processed>7d',
              jsonb_build_object('rows_deleted',v_deleted,'duration_ms',extract(millisecond from clock_timestamp()-v_step_start)));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata)
      VALUES ('auto_ttl_error','fila_whatsapp','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 4) wa_message_dedupe > 7d
  BEGIN
    DELETE FROM public.wa_message_dedupe WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('wa_message_dedupe', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','wa_message_dedupe','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 5) admin_telegram_dedupe > 7d
  BEGIN
    DELETE FROM public.admin_telegram_dedupe WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('admin_telegram_dedupe', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','admin_telegram_dedupe','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 6) reclame_aqui_ratelimit > 24h
  BEGIN
    DELETE FROM public.reclame_aqui_ratelimit WHERE created_at < now() - interval '24 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('reclame_aqui_ratelimit', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','reclame_aqui_ratelimit','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 7) ifood_event_log > 30d
  BEGIN
    v_step_start := clock_timestamp();
    DELETE FROM public.ifood_event_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('ifood_event_log', v_deleted);
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata)
      VALUES ('auto_ttl','ifood_event_log','>30d',
              jsonb_build_object('rows_deleted',v_deleted,'duration_ms',extract(millisecond from clock_timestamp()-v_step_start)));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','ifood_event_log','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 8) client_error_logs > 30d
  BEGIN
    DELETE FROM public.client_error_logs WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('client_error_logs', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','client_error_logs','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 9) whatsapp_notification_log > 30d
  BEGIN
    DELETE FROM public.whatsapp_notification_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('whatsapp_notification_log', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','whatsapp_notification_log','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 10) telegram_audit_log > 30d
  BEGIN
    DELETE FROM public.telegram_audit_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('telegram_audit_log', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','telegram_audit_log','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 11) admin_telegram_log > 30d
  BEGIN
    DELETE FROM public.admin_telegram_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('admin_telegram_log', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','admin_telegram_log','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 12) telegram_automations_log > 30d
  BEGIN
    DELETE FROM public.telegram_automations_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('telegram_automations_log', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','telegram_automations_log','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 13) activation_logs > 30d
  BEGIN
    DELETE FROM public.activation_logs WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('activation_logs', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','activation_logs','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 14) cron_health > 7d
  BEGIN
    DELETE FROM public.cron_health WHERE last_run_at < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('cron_health', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','cron_health','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 15) referral_block_logs > 90d
  BEGIN
    DELETE FROM public.referral_block_logs WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('referral_block_logs', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','referral_block_logs','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 16) fiscal_econf_events > 90d (NÃO é NF, é log de config)
  BEGIN
    DELETE FROM public.fiscal_econf_events WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('fiscal_econf_events', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.cleanup_logs(kind,target,reason,metadata) VALUES ('auto_ttl_error','fiscal_econf_events','error', jsonb_build_object('error',SQLERRM));
  END;

  -- 17) cleanup_logs > 90d (meta)
  BEGIN
    DELETE FROM public.cleanup_logs WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_total := v_total + v_deleted;
    v_report := v_report || jsonb_build_object('cleanup_logs', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Summary
  INSERT INTO public.cleanup_logs(kind, target, reason, metadata)
    VALUES ('auto_ttl_summary','storage_maintenance_job','daily',
            jsonb_build_object(
              'total_rows_deleted', v_total,
              'total_duration_ms', extract(millisecond from clock_timestamp() - v_start),
              'per_table', v_report,
              'ran_at', now()
            ));

  RETURN jsonb_build_object('ok', true, 'total_deleted', v_total, 'per_table', v_report);
END;
$$;

REVOKE ALL ON FUNCTION public.storage_maintenance_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_maintenance_job() TO service_role;

-- Unschedule if exists, then schedule daily 03:30 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('storage_maintenance_daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'storage_maintenance_daily',
  '30 3 * * *',
  $$SELECT public.storage_maintenance_job();$$
);
