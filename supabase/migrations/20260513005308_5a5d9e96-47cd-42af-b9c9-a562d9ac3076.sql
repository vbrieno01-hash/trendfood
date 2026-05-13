
-- Pending PIX subscription payments tracking + reconciliation cron
CREATE TABLE IF NOT EXISTS public.pending_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  promo_applied BOOLEAN NOT NULL DEFAULT false,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|expired|failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '35 minutes'),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_pix_status ON public.pending_subscription_payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_pending_pix_org ON public.pending_subscription_payments(organization_id, status);

ALTER TABLE public.pending_subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_pix_select_admin" ON public.pending_subscription_payments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "pending_pix_select_owner" ON public.pending_subscription_payments
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM organizations WHERE id = pending_subscription_payments.organization_id)
  );

-- Schedule reconciliation cron (every minute)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
