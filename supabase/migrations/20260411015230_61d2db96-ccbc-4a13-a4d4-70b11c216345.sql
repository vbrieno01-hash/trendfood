ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS theme_config jsonb NOT NULL DEFAULT '{}'::jsonb;