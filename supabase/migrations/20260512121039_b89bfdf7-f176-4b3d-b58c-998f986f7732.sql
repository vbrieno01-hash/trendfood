ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS hot_lead_min_orders integer NOT NULL DEFAULT 10;