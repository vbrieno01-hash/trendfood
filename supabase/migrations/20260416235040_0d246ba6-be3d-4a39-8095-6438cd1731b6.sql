ALTER TABLE public.ai_bot_config
  ADD COLUMN IF NOT EXISTS uazapi_server_url text DEFAULT 'https://free.uazapi.com',
  ADD COLUMN IF NOT EXISTS uazapi_token text,
  ADD COLUMN IF NOT EXISTS uazapi_instance_name text;