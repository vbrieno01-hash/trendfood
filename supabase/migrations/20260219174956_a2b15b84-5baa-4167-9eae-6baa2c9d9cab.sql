ALTER TABLE public.organizations
ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free';