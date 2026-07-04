
-- 1) platform_plans: quota e preço de excedente
ALTER TABLE public.platform_plans
  ADD COLUMN IF NOT EXISTS nfce_monthly_quota INT,
  ADD COLUMN IF NOT EXISTS nfce_overage_price_cents INT;

UPDATE public.platform_plans SET nfce_monthly_quota = 0    WHERE key = 'free'       AND nfce_monthly_quota IS NULL;
UPDATE public.platform_plans SET nfce_monthly_quota = 100  WHERE key = 'pro'        AND nfce_monthly_quota IS NULL;
UPDATE public.platform_plans SET nfce_monthly_quota = 1000 WHERE key = 'enterprise' AND nfce_monthly_quota IS NULL;

-- 2) organizations: autorização de excedente
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS nfce_overage_allowed BOOLEAN NOT NULL DEFAULT false;

-- 3) fiscal_config: modo do token
ALTER TABLE public.fiscal_config
  ADD COLUMN IF NOT EXISTS focus_token_mode TEXT NOT NULL DEFAULT 'platform';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fiscal_config_focus_token_mode_check') THEN
    ALTER TABLE public.fiscal_config
      ADD CONSTRAINT fiscal_config_focus_token_mode_check
      CHECK (focus_token_mode IN ('platform', 'own'));
  END IF;
END $$;

-- 4) organization_secrets: coluna para token Focus NFe do lojista
ALTER TABLE public.organization_secrets
  ADD COLUMN IF NOT EXISTS focus_nfe_token TEXT;

-- 5) fiscal_usage_log — alimentada pelo webhook ao autorizar
CREATE TABLE IF NOT EXISTS public.fiscal_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL UNIQUE REFERENCES public.fiscal_invoices(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fiscal_usage_log TO authenticated;
GRANT ALL ON public.fiscal_usage_log TO service_role;

ALTER TABLE public.fiscal_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiscal_usage_log_select_owner" ON public.fiscal_usage_log;
CREATE POLICY "fiscal_usage_log_select_owner"
  ON public.fiscal_usage_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = fiscal_usage_log.organization_id AND o.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX IF NOT EXISTS fiscal_usage_log_org_month_idx
  ON public.fiscal_usage_log (organization_id, month_start);

-- 6) Índices day-one em fiscal_invoices
CREATE INDEX IF NOT EXISTS fiscal_invoices_org_created_idx
  ON public.fiscal_invoices (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fiscal_invoices_org_status_created_idx
  ON public.fiscal_invoices (organization_id, status, created_at DESC);

-- 7) View de consumo do mês corrente
CREATE OR REPLACE VIEW public.fiscal_usage_current_month AS
  SELECT
    organization_id,
    date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date AS month_start,
    COUNT(*)::int AS authorized_count
  FROM public.fiscal_usage_log
  WHERE month_start = date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date
  GROUP BY organization_id;

GRANT SELECT ON public.fiscal_usage_current_month TO authenticated, service_role;

-- 8) RPC de checagem de quota
CREATE OR REPLACE FUNCTION public.fiscal_check_quota(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan TEXT;
  _quota INT;
  _overage_price INT;
  _overage_allowed BOOLEAN;
  _used INT := 0;
  _blocked BOOLEAN := false;
  _remaining INT;
  _reason TEXT := NULL;
BEGIN
  _plan := public.get_effective_plan(_org_id);

  SELECT nfce_monthly_quota, nfce_overage_price_cents
    INTO _quota, _overage_price
  FROM public.platform_plans WHERE key = _plan;

  -- 'lifetime' e planos sem entrada em platform_plans = ilimitado
  IF _plan = 'lifetime' THEN
    _quota := NULL;
  END IF;

  SELECT COALESCE(nfce_overage_allowed, false)
    INTO _overage_allowed
  FROM public.organizations WHERE id = _org_id;

  SELECT COALESCE(authorized_count, 0)
    INTO _used
  FROM public.fiscal_usage_current_month
  WHERE organization_id = _org_id;

  IF _quota IS NULL THEN
    _remaining := NULL;
    _blocked := false;
  ELSE
    _remaining := GREATEST(_quota - _used, 0);
    IF _used >= _quota THEN
      _blocked := true;
      _reason := CASE
        WHEN _quota = 0 THEN 'Plano ' || _plan || ' não inclui emissão de NFC-e. Faça upgrade.'
        ELSE 'Cota mensal de ' || _quota || ' notas atingida no plano ' || _plan || '.'
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'used', _used,
    'quota', _quota,
    'remaining', _remaining,
    'blocked', _blocked,
    'reason', _reason,
    'overage_allowed', COALESCE(_overage_allowed, false),
    'overage_price_cents', _overage_price
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fiscal_check_quota(UUID) TO authenticated, service_role;
