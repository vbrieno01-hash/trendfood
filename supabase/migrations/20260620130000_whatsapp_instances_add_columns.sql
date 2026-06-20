-- Adiciona colunas faltantes em whatsapp_instances
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS server_url    text,
  ADD COLUMN IF NOT EXISTS phone_connected text,
  ADD COLUMN IF NOT EXISTS connected_at  timestamptz;
