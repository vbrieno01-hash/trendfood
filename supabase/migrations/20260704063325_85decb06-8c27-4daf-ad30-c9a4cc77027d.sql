
CREATE TABLE public.fiscal_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('auto','manual')),
  environment TEXT NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao','producao')),
  producao_liberada BOOLEAN NOT NULL DEFAULT false,
  cnpj TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  ie TEXT,
  im TEXT,
  regime_tributario SMALLINT CHECK (regime_tributario IN (1,2,3)),
  endereco_json JSONB,
  csc_id TEXT,
  csc_token TEXT,
  plugnotas_empresa_id TEXT,
  certificado_uploaded_at TIMESTAMPTZ,
  certificado_expira_em DATE,
  cfop_padrao TEXT DEFAULT '5102',
  default_ncm TEXT,
  default_cest TEXT,
  default_origem SMALLINT DEFAULT 0,
  default_cst_csosn TEXT DEFAULT '102',
  default_unidade TEXT DEFAULT 'UN',
  serie_nfce SMALLINT DEFAULT 1,
  proximo_numero INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_config TO authenticated;
GRANT ALL ON public.fiscal_config TO service_role;
ALTER TABLE public.fiscal_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their fiscal_config" ON public.fiscal_config
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = fiscal_config.organization_id AND o.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = fiscal_config.organization_id AND o.user_id = auth.uid()));

CREATE TABLE public.fiscal_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','authorized','rejected','cancelled')),
  environment TEXT NOT NULL DEFAULT 'homologacao',
  plugnotas_id TEXT,
  numero INTEGER,
  serie SMALLINT,
  chave_acesso TEXT,
  protocolo TEXT,
  xml_url TEXT,
  danfe_url TEXT,
  qrcode_url TEXT,
  rejection_reason TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  emitted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fiscal_invoices_org ON public.fiscal_invoices(organization_id);
CREATE INDEX idx_fiscal_invoices_status ON public.fiscal_invoices(status);
CREATE INDEX idx_fiscal_invoices_emitted ON public.fiscal_invoices(emitted_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_invoices TO authenticated;
GRANT ALL ON public.fiscal_invoices TO service_role;
ALTER TABLE public.fiscal_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view their fiscal invoices" ON public.fiscal_invoices
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = fiscal_invoices.organization_id AND o.user_id = auth.uid()));
CREATE POLICY "Owners insert their fiscal invoices" ON public.fiscal_invoices
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = fiscal_invoices.organization_id AND o.user_id = auth.uid()));
CREATE POLICY "Owners update their fiscal invoices" ON public.fiscal_invoices
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = fiscal_invoices.organization_id AND o.user_id = auth.uid()));

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS ncm TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT,
  ADD COLUMN IF NOT EXISTS cfop TEXT,
  ADD COLUMN IF NOT EXISTS origem SMALLINT,
  ADD COLUMN IF NOT EXISTS cst_csosn TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS codigo_ean TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fiscal_status TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_invoice_id UUID REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tg_fiscal_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER fiscal_config_updated_at BEFORE UPDATE ON public.fiscal_config
FOR EACH ROW EXECUTE FUNCTION public.tg_fiscal_touch_updated_at();
CREATE TRIGGER fiscal_invoices_updated_at BEFORE UPDATE ON public.fiscal_invoices
FOR EACH ROW EXECUTE FUNCTION public.tg_fiscal_touch_updated_at();

CREATE OR REPLACE FUNCTION public.tg_orders_auto_emit_nfce()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg RECORD;
  v_url TEXT;
  v_anon TEXT;
BEGIN
  IF NEW.status NOT IN ('delivered','completed','entregue','concluido','concluído') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_cfg FROM public.fiscal_config
   WHERE organization_id = NEW.organization_id AND enabled = true AND mode = 'auto';
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.fiscal_invoices WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  SELECT value INTO v_url FROM public.platform_config WHERE key = 'supabase_functions_url';
  SELECT value INTO v_anon FROM public.platform_config WHERE key = 'supabase_anon_key';
  IF v_url IS NULL OR v_anon IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM net.http_post(
    url := v_url || '/fiscal-auto-emit-trigger',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
    body := jsonb_build_object('order_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;

CREATE TRIGGER orders_auto_emit_nfce
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_auto_emit_nfce();
