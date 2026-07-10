SELECT cron.schedule(
  'watchdog-pix-stuck',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/watchdog-pix-stuck',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyenVkaHlscHBobnpvdXNpbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NTM1NzMsImV4cCI6MjA4NzAyOTU3M30.eEvmxp2aUsjdYAa-crOgB-NtdgPlfgfyT6fyyPA85Nc"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);