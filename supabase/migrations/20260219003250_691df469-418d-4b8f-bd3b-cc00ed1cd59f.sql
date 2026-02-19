ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial';