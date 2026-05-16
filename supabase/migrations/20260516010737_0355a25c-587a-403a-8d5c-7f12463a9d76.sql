ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS ifood_courier_copy boolean NOT NULL DEFAULT false;