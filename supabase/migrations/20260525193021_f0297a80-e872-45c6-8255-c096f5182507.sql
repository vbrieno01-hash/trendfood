ALTER TABLE public.ai_bot_config
  ADD COLUMN IF NOT EXISTS test_instance_name text,
  ADD COLUMN IF NOT EXISTS test_instance_token text;