-- 1. Tabela affiliates
CREATE TABLE public.affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  commission_pct NUMERIC NOT NULL DEFAULT 50,
  pix_key TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliates_code ON public.affiliates(code);
CREATE INDEX idx_affiliates_active ON public.affiliates(active);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage affiliates"
ON public.affiliates FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Coluna affiliate_id em organizations
ALTER TABLE public.organizations
ADD COLUMN affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_affiliate_id ON public.organizations(affiliate_id);

-- 3. Tabela affiliate_commissions
CREATE TABLE public.affiliate_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_id TEXT,
  amount_paid_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  commission_pct NUMERIC NOT NULL,
  billing_cycle TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  release_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  released_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_commissions_status_check CHECK (status IN ('pending','released','paid','refunded'))
);

CREATE INDEX idx_aff_comm_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_aff_comm_org ON public.affiliate_commissions(organization_id);
CREATE INDEX idx_aff_comm_status_release ON public.affiliate_commissions(status, release_at);
CREATE UNIQUE INDEX idx_aff_comm_payment ON public.affiliate_commissions(payment_id) WHERE payment_id IS NOT NULL;

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commissions"
ON public.affiliate_commissions FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));