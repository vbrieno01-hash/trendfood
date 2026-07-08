
-- 1) Colunas de identificação do consumidor no pedido (opcionais)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_name_fiscal TEXT;

-- Validação leve — CPF (11) ou CNPJ (14) só dígitos (permite NULL).
DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_cpf_format
    CHECK (customer_cpf IS NULL OR customer_cpf ~ '^[0-9]{11}$' OR customer_cpf ~ '^[0-9]{14}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_customer_email_format
    CHECK (customer_email IS NULL OR customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Função de validação de prontidão fiscal (server-side checklist)
CREATE OR REPLACE FUNCTION public.validate_fiscal_ready(_org_id UUID)
RETURNS TABLE(item TEXT, ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
  end_json JSONB;
  test_authorized INTEGER;
BEGIN
  SELECT * INTO cfg FROM public.fiscal_config WHERE organization_id = _org_id;

  IF cfg IS NULL THEN
    RETURN QUERY SELECT 'config'::TEXT, FALSE, 'Configuração fiscal não iniciada'::TEXT;
    RETURN;
  END IF;

  end_json := COALESCE(cfg.endereco_json, '{}'::JSONB);

  RETURN QUERY SELECT 'cnpj'::TEXT,
    (cfg.cnpj IS NOT NULL AND length(regexp_replace(cfg.cnpj,'\D','','g')) = 14),
    'CNPJ válido (14 dígitos)'::TEXT;

  RETURN QUERY SELECT 'razao_social'::TEXT,
    (cfg.razao_social IS NOT NULL AND length(trim(cfg.razao_social)) > 0),
    'Razão social preenchida'::TEXT;

  RETURN QUERY SELECT 'ie'::TEXT,
    (cfg.ie IS NOT NULL AND length(trim(cfg.ie)) > 0),
    'Inscrição Estadual (use "ISENTO" se não tiver)'::TEXT;

  RETURN QUERY SELECT 'regime'::TEXT,
    (cfg.regime_tributario IS NOT NULL AND cfg.regime_tributario BETWEEN 1 AND 3),
    'Regime tributário selecionado'::TEXT;

  RETURN QUERY SELECT 'endereco'::TEXT,
    (COALESCE(end_json->>'logradouro','') <> ''
     AND COALESCE(end_json->>'numero','') <> ''
     AND COALESCE(end_json->>'bairro','') <> ''
     AND COALESCE(end_json->>'cidade','') <> ''
     AND COALESCE(end_json->>'uf','') <> ''
     AND COALESCE(end_json->>'cep','') <> ''),
    'Endereço fiscal completo'::TEXT;

  RETURN QUERY SELECT 'csc'::TEXT,
    (cfg.csc_id IS NOT NULL AND length(trim(cfg.csc_id)) > 0
     AND cfg.csc_token IS NOT NULL AND length(trim(cfg.csc_token)) > 0),
    'CSC ID e CSC Token da SEFAZ'::TEXT;

  RETURN QUERY SELECT 'certificado'::TEXT,
    (cfg.certificado_uploaded_at IS NOT NULL
     AND (cfg.certificado_expira_em IS NULL OR cfg.certificado_expira_em > (CURRENT_DATE + INTERVAL '7 days'))),
    'Certificado A1 enviado e válido por mais de 7 dias'::TEXT;

  RETURN QUERY SELECT 'focus_empresa'::TEXT,
    (cfg.plugnotas_empresa_id IS NOT NULL AND length(trim(cfg.plugnotas_empresa_id)) > 0),
    'Empresa provisionada na Focus NFe'::TEXT;

  RETURN QUERY SELECT 'serie'::TEXT,
    (cfg.serie_nfce IS NOT NULL AND cfg.proximo_numero IS NOT NULL AND cfg.proximo_numero > 0),
    'Série e próximo número configurados'::TEXT;

  -- Homologação: pelo menos 1 emissão autorizada de teste
  SELECT COUNT(*) INTO test_authorized
    FROM public.fiscal_invoices
   WHERE organization_id = _org_id
     AND status = 'authorized'
     AND environment = 'homologacao';

  RETURN QUERY SELECT 'homolog_test'::TEXT,
    (test_authorized > 0),
    'Ao menos 1 NFC-e autorizada em homologação'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_fiscal_ready(UUID) TO authenticated, service_role;

-- 3) Trigger que impede ativar produção sem checklist 100% verde
CREATE OR REPLACE FUNCTION public.fiscal_config_guard_producao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending TEXT;
BEGIN
  -- Só valida quando o usuário está TENTANDO ligar produção
  IF NEW.producao_liberada IS TRUE
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.producao_liberada, FALSE) IS DISTINCT FROM TRUE)
  THEN
    SELECT string_agg(item, ', ')
      INTO pending
      FROM public.validate_fiscal_ready(NEW.organization_id)
     WHERE ok IS FALSE;

    IF pending IS NOT NULL THEN
      RAISE EXCEPTION 'Não é possível liberar produção: pendências no checklist fiscal (%). Complete a configuração antes de ativar.', pending
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fiscal_config_producao_guard ON public.fiscal_config;
CREATE TRIGGER fiscal_config_producao_guard
BEFORE INSERT OR UPDATE OF producao_liberada ON public.fiscal_config
FOR EACH ROW EXECUTE FUNCTION public.fiscal_config_guard_producao();
