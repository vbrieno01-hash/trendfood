ALTER TABLE public.organizations
ADD COLUMN courier_config jsonb DEFAULT '{"base_fee": 3.0, "per_km": 2.5}'::jsonb;