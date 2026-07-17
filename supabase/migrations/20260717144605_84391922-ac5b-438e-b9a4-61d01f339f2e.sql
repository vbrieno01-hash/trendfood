DO $$
DECLARE _kept int;
BEGIN
  CREATE TEMP TABLE _tmp_ifood ON COMMIT DROP AS
    SELECT * FROM public.ifood_event_log WHERE received_at > now() - interval '3 days';
  TRUNCATE public.ifood_event_log;
  INSERT INTO public.ifood_event_log SELECT * FROM _tmp_ifood;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'ifood_event_log kept: %', _kept;

  CREATE TEMP TABLE _tmp_filawa ON COMMIT DROP AS
    SELECT * FROM public.fila_whatsapp WHERE created_at > now() - interval '2 days';
  TRUNCATE public.fila_whatsapp;
  INSERT INTO public.fila_whatsapp SELECT * FROM _tmp_filawa;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'fila_whatsapp kept: %', _kept;

  CREATE TEMP TABLE _tmp_dedupe ON COMMIT DROP AS
    SELECT * FROM public.wa_message_dedupe WHERE created_at > now() - interval '1 day';
  TRUNCATE public.wa_message_dedupe;
  INSERT INTO public.wa_message_dedupe SELECT * FROM _tmp_dedupe;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'wa_message_dedupe kept: %', _kept;

  CREATE TEMP TABLE _tmp_err ON COMMIT DROP AS
    SELECT * FROM public.client_error_logs WHERE created_at > now() - interval '7 days';
  TRUNCATE public.client_error_logs;
  INSERT INTO public.client_error_logs SELECT * FROM _tmp_err;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'client_error_logs kept: %', _kept;

  CREATE TEMP TABLE _tmp_fila ON COMMIT DROP AS
    SELECT * FROM public.fila_impressao
    WHERE status <> 'impresso' OR created_at > now() - interval '1 day';
  TRUNCATE public.fila_impressao;
  INSERT INTO public.fila_impressao SELECT * FROM _tmp_fila;
  GET DIAGNOSTICS _kept = ROW_COUNT; RAISE NOTICE 'fila_impressao kept: %', _kept;
END $$;