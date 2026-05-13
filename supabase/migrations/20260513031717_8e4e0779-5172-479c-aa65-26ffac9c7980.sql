-- Ledger de pagamentos reais de assinatura
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id text UNIQUE,
  plan text NOT NULL,
  billing_cycle text,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  promo_applied boolean NOT NULL DEFAULT false,
  paid_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'mp_webhook',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_payments_org_paid ON public.subscription_payments (organization_id, paid_at DESC);
CREATE INDEX idx_subscription_payments_paid_at ON public.subscription_payments (paid_at DESC);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_payments_select_admin"
  ON public.subscription_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "subscription_payments_insert_admin"
  ON public.subscription_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "subscription_payments_update_admin"
  ON public.subscription_payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND source = 'manual')
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND source = 'manual');

CREATE POLICY "subscription_payments_delete_admin"
  ON public.subscription_payments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND source = 'manual');

CREATE POLICY "subscription_payments_service_all"
  ON public.subscription_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);