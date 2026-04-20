-- Schedule daily cleanup of broken banner_url entries
select cron.schedule(
  'cleanup-broken-banners-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/cleanup-broken-banners',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);