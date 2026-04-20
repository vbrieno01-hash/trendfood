-- ============================================================================
-- 1) RPC get_effective_plan(_org_id) — fonte única da verdade
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_effective_plan(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org RECORD;
  _now TIMESTAMPTZ := now();
BEGIN
  SELECT subscription_plan, trial_ends_at
  INTO _org
  FROM organizations
  WHERE id = _org_id;

  IF NOT FOUND THEN
    RETURN 'free';
  END IF;

  -- Lifetime nunca expira
  IF _org.subscription_plan = 'lifetime' THEN
    RETURN 'lifetime';
  END IF;

  -- Pago expirado vira free
  IF _org.subscription_plan IN ('pro', 'enterprise')
     AND _org.trial_ends_at IS NOT NULL
     AND _org.trial_ends_at <= _now
  THEN
    RETURN 'free';
  END IF;

  -- Free com trial ativo conta como pro
  IF _org.subscription_plan = 'free'
     AND _org.trial_ends_at IS NOT NULL
     AND _org.trial_ends_at > _now
  THEN
    RETURN 'pro';
  END IF;

  RETURN COALESCE(_org.subscription_plan, 'free');
END;
$$;

-- ============================================================================
-- 2) Trigger gate: coupons (bloqueia INSERT se free)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gate_coupons_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_effective_plan(NEW.organization_id) = 'free' THEN
    RAISE EXCEPTION 'Cupons disponíveis apenas no plano Pro. Renove sua assinatura para criar novos cupons.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gate_coupons_paid_plan ON public.coupons;
CREATE TRIGGER tr_gate_coupons_paid_plan
  BEFORE INSERT ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.gate_coupons_paid_plan();

-- ============================================================================
-- 3) Trigger gate: loyalty_config (bloqueia INSERT/UPDATE com enabled=true se free)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gate_loyalty_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só bloqueia se está tentando ATIVAR (enabled=true).
  -- Permite UPDATE para desativar (enabled=false) mesmo no Free, e permite outras edições com enabled=false.
  IF NEW.enabled = true AND public.get_effective_plan(NEW.organization_id) = 'free' THEN
    RAISE EXCEPTION 'Programa de fidelidade disponível apenas no plano Pro. Renove sua assinatura para ativar.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gate_loyalty_paid_plan ON public.loyalty_config;
CREATE TRIGGER tr_gate_loyalty_paid_plan
  BEFORE INSERT OR UPDATE ON public.loyalty_config
  FOR EACH ROW EXECUTE FUNCTION public.gate_loyalty_paid_plan();

-- ============================================================================
-- 4) Trigger gate: delivery_neighborhoods (bloqueia INSERT se free)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gate_delivery_neighborhoods_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_effective_plan(NEW.organization_id) = 'free' THEN
    RAISE EXCEPTION 'Bairros de entrega disponíveis apenas no plano Pro. Renove sua assinatura para cadastrar novos bairros.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gate_neighborhoods_paid_plan ON public.delivery_neighborhoods;
CREATE TRIGGER tr_gate_neighborhoods_paid_plan
  BEFORE INSERT ON public.delivery_neighborhoods
  FOR EACH ROW EXECUTE FUNCTION public.gate_delivery_neighborhoods_paid_plan();

-- ============================================================================
-- 5) Trigger gate: global_addons (bloqueia INSERT se free)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gate_global_addons_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_effective_plan(NEW.organization_id) = 'free' THEN
    RAISE EXCEPTION 'Adicionais disponíveis apenas no plano Pro. Renove sua assinatura para criar novos adicionais.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gate_global_addons_paid_plan ON public.global_addons;
CREATE TRIGGER tr_gate_global_addons_paid_plan
  BEFORE INSERT ON public.global_addons
  FOR EACH ROW EXECUTE FUNCTION public.gate_global_addons_paid_plan();

-- ============================================================================
-- 6) Trigger gate: menu_item_addons (bloqueia INSERT se free) — usa join via menu_items
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gate_menu_item_addons_paid_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
  FROM menu_items
  WHERE id = NEW.menu_item_id;

  IF _org_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.get_effective_plan(_org_id) = 'free' THEN
    RAISE EXCEPTION 'Adicionais disponíveis apenas no plano Pro. Renove sua assinatura para criar novos adicionais.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_gate_menu_item_addons_paid_plan ON public.menu_item_addons;
CREATE TRIGGER tr_gate_menu_item_addons_paid_plan
  BEFORE INSERT ON public.menu_item_addons
  FOR EACH ROW EXECUTE FUNCTION public.gate_menu_item_addons_paid_plan();