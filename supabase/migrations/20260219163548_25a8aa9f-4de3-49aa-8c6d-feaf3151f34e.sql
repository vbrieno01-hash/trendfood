ALTER TABLE public.organizations 
ADD COLUMN onboarding_done boolean NOT NULL DEFAULT false;

UPDATE public.organizations SET onboarding_done = true;