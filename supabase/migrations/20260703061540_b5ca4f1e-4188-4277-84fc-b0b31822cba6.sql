CREATE TABLE IF NOT EXISTS public.wa_message_dedupe (
  message_id TEXT PRIMARY KEY,
  instance_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.wa_message_dedupe TO service_role;
ALTER TABLE public.wa_message_dedupe ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS wa_message_dedupe_created_idx ON public.wa_message_dedupe (created_at);