
-- =============================================
-- 1. PROTEGER LEITURA DE PEDIDOS (CRÍTICO)
-- =============================================

-- Remover policy antiga que expõe TODOS os pedidos
DROP POLICY IF EXISTS "orders_select_public" ON public.orders;

-- Permitir leitura pública apenas de pedidos das últimas 24h
CREATE POLICY "orders_select_public_recent"
ON public.orders FOR SELECT TO public
USING (created_at > now() - interval '24 hours');

-- Owner continua vendo todos os pedidos (já existe via outras policies? Não, precisa criar)
CREATE POLICY "orders_select_owner"
ON public.orders FOR SELECT TO public
USING (auth.uid() = (SELECT o.user_id FROM organizations o WHERE o.id = orders.organization_id));

-- Admin continua vendo todos
CREATE POLICY "orders_select_admin"
ON public.orders FOR SELECT TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. RESTRINGIR INSERT EM ORDER_ITEMS
-- =============================================

DROP POLICY IF EXISTS "order_items_insert_public" ON public.order_items;

-- Só permite inserir itens em pedidos que existem E estão pendentes
CREATE POLICY "order_items_insert_public_safe"
ON public.order_items FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
      AND orders.status = 'pending'
  )
);

-- =============================================
-- 3. RESTRINGIR INSERT EM TABELAS SENSÍVEIS
-- =============================================

-- loyalty_points: só permite INSERT se org existe
DROP POLICY IF EXISTS "loyalty_points_insert_public" ON public.loyalty_points;
CREATE POLICY "loyalty_points_insert_validated"
ON public.loyalty_points FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM organizations WHERE id = loyalty_points.organization_id)
);

-- loyalty_points: restringir UPDATE público para org existente
DROP POLICY IF EXISTS "loyalty_points_update_public" ON public.loyalty_points;
CREATE POLICY "loyalty_points_update_validated"
ON public.loyalty_points FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM organizations WHERE id = loyalty_points.organization_id)
);

-- loyalty_redemptions: só permite INSERT se org existe
DROP POLICY IF EXISTS "loyalty_redemptions_insert_public" ON public.loyalty_redemptions;
CREATE POLICY "loyalty_redemptions_insert_validated"
ON public.loyalty_redemptions FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM organizations WHERE id = loyalty_redemptions.organization_id)
);

-- couriers: restringir INSERT para org existente (owner ou admin)
DROP POLICY IF EXISTS "couriers_insert_public" ON public.couriers;
CREATE POLICY "couriers_insert_owner"
ON public.couriers FOR INSERT TO public
WITH CHECK (
  auth.uid() = (SELECT o.user_id FROM organizations o WHERE o.id = couriers.organization_id)
);
CREATE POLICY "couriers_insert_admin"
ON public.couriers FOR INSERT TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- courier_shifts: restringir INSERT para org existente
DROP POLICY IF EXISTS "courier_shifts_insert_public" ON public.courier_shifts;
CREATE POLICY "courier_shifts_insert_validated"
ON public.courier_shifts FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM organizations WHERE id = courier_shifts.organization_id)
);
