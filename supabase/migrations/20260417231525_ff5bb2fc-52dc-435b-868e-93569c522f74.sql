ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS category_emojis JSONB NOT NULL DEFAULT '{}'::jsonb;