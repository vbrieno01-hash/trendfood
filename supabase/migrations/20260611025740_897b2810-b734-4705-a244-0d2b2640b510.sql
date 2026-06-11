ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '{"dinheiro":true,"maquininha":true,"debito":true,"credito":true,"pix":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS category_layout jsonb NOT NULL DEFAULT '{}'::jsonb;