
-- 1. cash_withdrawals: restringir SELECT ao dono
DROP POLICY IF EXISTS "cash_withdrawals_select_public" ON public.cash_withdrawals;
CREATE POLICY "cash_withdrawals_select_owner" ON public.cash_withdrawals
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = cash_withdrawals.organization_id
    )
  );

-- 2. orders: restringir UPDATE publico (impedir alteracao de organization_id e table_number)
DROP POLICY IF EXISTS "orders_update_status_public" ON public.orders;
CREATE POLICY "orders_update_public_safe" ON public.orders
  FOR UPDATE
  USING (true)
  WITH CHECK (
    organization_id = (SELECT o2.organization_id FROM public.orders o2 WHERE o2.id = orders.id)
    AND table_number = (SELECT o3.table_number FROM public.orders o3 WHERE o3.id = orders.id)
  );

-- 3. coupons: restringir SELECT ao dono
DROP POLICY IF EXISTS "coupons_select_public" ON public.coupons;
CREATE POLICY "coupons_select_owner" ON public.coupons
  FOR SELECT USING (
    auth.uid() = (
      SELECT o.user_id FROM organizations o
      WHERE o.id = coupons.organization_id
    )
  );

-- 4. RPC para validar cupom publicamente (sem expor a tabela)
CREATE OR REPLACE FUNCTION public.validate_coupon_by_code(
  _org_id uuid,
  _code text,
  _cart_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon RECORD;
BEGIN
  SELECT * INTO _coupon FROM coupons
  WHERE organization_id = _org_id
    AND UPPER(TRIM(code)) = UPPER(TRIM(_code))
    AND active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom não encontrado ou inativo.');
  END IF;

  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Cupom expirado.');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses >= _coupon.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Limite de usos atingido.');
  END IF;

  IF _cart_total < _coupon.min_order THEN
    RETURN jsonb_build_object('valid', false, 'reason',
      'Pedido mínimo de R$ ' || TO_CHAR(_coupon.min_order, 'FM999990D00') || ' para este cupom.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon', jsonb_build_object(
      'id', _coupon.id,
      'code', _coupon.code,
      'type', _coupon.type,
      'value', _coupon.value,
      'min_order', _coupon.min_order
    )
  );
END;
$$;

-- 5. RPC para incrementar uso do cupom de forma segura
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coupons SET uses = uses + 1 WHERE id = _coupon_id;
END;
$$;
