
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS force_open boolean NOT NULL DEFAULT false;
