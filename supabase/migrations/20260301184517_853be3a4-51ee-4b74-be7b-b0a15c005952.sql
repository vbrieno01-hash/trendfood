
ALTER TABLE platform_plans ADD COLUMN annual_price_cents integer DEFAULT 0;
ALTER TABLE organizations ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';
