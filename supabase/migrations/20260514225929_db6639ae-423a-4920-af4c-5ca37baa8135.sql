ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ifood_order_type text,
  ADD COLUMN IF NOT EXISTS ifood_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS ifood_concluded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_ifood_gateway ON public.orders (gateway_payment_id) WHERE gateway_payment_id LIKE 'ifood:%';