-- ============================================================
-- FASE 2 / ETAPA 1: Funções SECURITY DEFINER para fidelidade
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_loyalty_public_config(_org_id uuid)
RETURNS TABLE (
  enabled boolean,
  spend_per_point numeric,
  points_to_redeem integer,
  reward_type text,
  reward_value numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.enabled, c.spend_per_point, c.points_to_redeem, c.reward_type, c.reward_value
  FROM public.loyalty_config c
  WHERE c.organization_id = _org_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_loyalty_points_by_phone(_org_id uuid, _phone text)
RETURNS TABLE (
  points integer,
  total_spent numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := regexp_replace(COALESCE(_phone, ''), '\D', '', 'g');
BEGIN
  IF char_length(_clean) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.points, p.total_spent
  FROM public.loyalty_points p
  WHERE p.organization_id = _org_id
    AND p.phone = _clean
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accumulate_loyalty_points(
  _org_id uuid,
  _phone text,
  _order_total numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := regexp_replace(COALESCE(_phone, ''), '\D', '', 'g');
  _spp numeric;
  _enabled boolean;
  _earned integer;
BEGIN
  IF char_length(_clean) < 10 OR COALESCE(_order_total, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT enabled, spend_per_point
    INTO _enabled, _spp
  FROM public.loyalty_config
  WHERE organization_id = _org_id;

  IF NOT FOUND OR _enabled IS NOT TRUE OR COALESCE(_spp, 0) <= 0 THEN
    RETURN 0;
  END IF;

  _earned := floor(_order_total / _spp)::int;
  IF _earned <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.loyalty_points (organization_id, phone, points, total_spent)
  VALUES (_org_id, _clean, _earned, _order_total)
  ON CONFLICT (organization_id, phone) DO UPDATE
    SET points = public.loyalty_points.points + EXCLUDED.points,
        total_spent = public.loyalty_points.total_spent + EXCLUDED.total_spent,
        updated_at = now();

  RETURN _earned;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  _org_id uuid,
  _phone text,
  _points_used integer,
  _discount_value numeric,
  _order_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text := regexp_replace(COALESCE(_phone, ''), '\D', '', 'g');
  _current integer;
BEGIN
  IF char_length(_clean) < 10 OR _points_used <= 0 OR _discount_value <= 0 THEN
    RAISE EXCEPTION 'Parâmetros inválidos para resgate' USING ERRCODE = 'P0001';
  END IF;

  SELECT points INTO _current
  FROM public.loyalty_points
  WHERE organization_id = _org_id AND phone = _clean
  FOR UPDATE;

  IF NOT FOUND OR _current < _points_used THEN
    RAISE EXCEPTION 'Pontos insuficientes' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.loyalty_points
     SET points = points - _points_used,
         updated_at = now()
   WHERE organization_id = _org_id AND phone = _clean;

  INSERT INTO public.loyalty_redemptions
    (organization_id, phone, points_used, discount_value, order_id)
  VALUES
    (_org_id, _clean, _points_used, _discount_value, _order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_loyalty_public_config(uuid)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_loyalty_points_by_phone(uuid, text)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accumulate_loyalty_points(uuid, text, numeric)           TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, text, integer, numeric, uuid) TO anon, authenticated;