-- Agenda varredura automática a cada 1 minuto para reprocessar pedidos iFood órfãos
SELECT cron.schedule(
  'ifood-orphan-sweeper-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-orphan-sweeper',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);