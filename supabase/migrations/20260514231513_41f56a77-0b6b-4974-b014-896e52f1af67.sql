ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ifood_cancellation_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_ifood_cancellation_requested
  ON public.orders (organization_id)
  WHERE ifood_cancellation_requested_at IS NOT NULL;