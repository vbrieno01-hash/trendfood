-- =====================================================================
-- Fiscal NFC-e: novos endpoints (consultar, email, inutilizar, econf)
-- =====================================================================

-- 1) Coluna emails_sent em fiscal_invoices (histórico de envios)
ALTER TABLE public.fiscal_invoices
  ADD COLUMN IF NOT EXISTS emails_sent JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) Tabela de inutilizações de numeração
CREATE TABLE IF NOT EXISTS public.fiscal_inutilizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  serie INTEGER NOT NULL,
  numero_inicial INTEGER NOT NULL,
  numero_final INTEGER NOT NULL,
  justificativa TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'homologacao',
  status TEXT NOT NULL DEFAULT 'processing', -- processing | authorized | rejected
  protocolo TEXT,
  xml_url TEXT,
  mensagem_sefaz TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_inutilizations_org ON public.fiscal_inutilizations(organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_inutilizations TO authenticated;
GRANT ALL ON public.fiscal_inutilizations TO service_role;

ALTER TABLE public.fiscal_inutilizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_owner_reads_inutilizations"
  ON public.fiscal_inutilizations FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "admin_reads_all_inutilizations"
  ON public.fiscal_inutilizations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_writes_inutilizations"
  ON public.fiscal_inutilizations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_fiscal_inutilizations_updated_at
  BEFORE UPDATE ON public.fiscal_inutilizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Tabela de eventos ECONF (conciliação financeira)
CREATE TABLE IF NOT EXISTS public.fiscal_econf_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  protocolo TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- processing | registered | cancelled | rejected
  payload_json JSONB,
  response_json JSONB,
  cancel_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_econf_invoice ON public.fiscal_econf_events(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_econf_org ON public.fiscal_econf_events(organization_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_econf_events TO authenticated;
GRANT ALL ON public.fiscal_econf_events TO service_role;

ALTER TABLE public.fiscal_econf_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_owner_reads_econf"
  ON public.fiscal_econf_events FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT id FROM public.organizations WHERE user_id = auth.uid()));

CREATE POLICY "admin_reads_all_econf"
  ON public.fiscal_econf_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_writes_econf"
  ON public.fiscal_econf_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_fiscal_econf_updated_at
  BEFORE UPDATE ON public.fiscal_econf_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();