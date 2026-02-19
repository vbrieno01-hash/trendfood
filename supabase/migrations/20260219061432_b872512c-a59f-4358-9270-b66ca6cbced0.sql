ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS store_address text,
  ADD COLUMN IF NOT EXISTS delivery_config jsonb DEFAULT '{"fee_tier1":5.00,"fee_tier2":8.00,"fee_tier3":12.00,"tier1_km":2,"tier2_km":5,"free_above":100.00}'::jsonb;