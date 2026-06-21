-- Adiciona campos de cupom na tabela orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id     uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;

-- RPC pública: valida cupom de UMA loja específica
-- Chamada pelo cliente no checkout — retorna JSON com resultado
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code            text,
  _organization_id uuid,
  _order_total     numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v  coupons%ROWTYPE;
  v_discount numeric;
BEGIN
  -- Busca cupom APENAS desta loja (isolamento total entre lojas)
  SELECT * INTO v
  FROM public.coupons
  WHERE upper(trim(code)) = upper(trim(_code))
    AND organization_id = _organization_id
    AND active = true;

  IF v.id IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom inválido para esta loja');
  END IF;

  -- Validade
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'error', 'Cupom expirado');
  END IF;

  -- Limite de usos
  IF v.max_uses IS NOT NULL AND v.uses >= v.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Este cupom já atingiu o limite de usos');
  END IF;

  -- Pedido mínimo
  IF _order_total < v.min_order THEN
    RETURN json_build_object(
      'valid', false,
      'error', format('Pedido mínimo de R$ %s para este cupom',
        replace(to_char(v.min_order, 'FM999G990D00'), '.', ','))
    );
  END IF;

  -- Calcula desconto
  IF v.type = 'percentage' THEN
    v_discount := round((_order_total * v.value / 100.0), 2);
  ELSE
    v_discount := least(v.value, _order_total);
  END IF;

  RETURN json_build_object(
    'valid',       true,
    'coupon_id',   v.id,
    'code',        v.code,
    'type',        v.type,
    'value',       v.value,
    'discount',    v_discount
  );
END; $$;

-- Qualquer um pode validar (página pública do cliente)
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) TO anon, authenticated;
