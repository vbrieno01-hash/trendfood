
ALTER TABLE public.ai_bot_config
  DROP COLUMN IF EXISTS uazapi_server_url,
  DROP COLUMN IF EXISTS uazapi_token,
  DROP COLUMN IF EXISTS uazapi_instance_name;
