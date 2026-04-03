
-- Função que busca dados do pedido sem RLS (evita recursão infinita)
CREATE OR REPLACE FUNCTION public.get_order_immutable_fields(p_order_id uuid)
RETURNS TABLE(organization_id uuid, table_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.organization_id, o.table_number
  FROM orders o WHERE o.id = p_order_id LIMIT 1;
$$;

-- Revogar acesso público e conceder apenas a authenticated e anon
REVOKE EXECUTE ON FUNCTION public.get_order_immutable_fields FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_immutable_fields TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_immutable_fields TO anon;

-- Substituir policy problemática
DROP POLICY IF EXISTS "orders_update_public_safe" ON public.orders;
CREATE POLICY "orders_update_public_safe" ON public.orders
  FOR UPDATE USING (true)
  WITH CHECK (
    (SELECT f.organization_id FROM get_order_immutable_fields(id) f) = organization_id
    AND (SELECT f.table_number FROM get_order_immutable_fields(id) f) = table_number
  );
