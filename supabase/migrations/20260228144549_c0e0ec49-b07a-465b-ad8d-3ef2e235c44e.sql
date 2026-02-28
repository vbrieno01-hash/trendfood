
-- Admin DELETE policies for all org-related tables
CREATE POLICY "organizations_delete_admin" ON public.organizations
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "order_items_delete_admin" ON public.order_items
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_items_delete_admin" ON public.menu_items
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "tables_delete_admin" ON public.tables
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cash_withdrawals_delete_admin" ON public.cash_withdrawals
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cash_sessions_delete_admin" ON public.cash_sessions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "coupons_delete_admin" ON public.coupons
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "suggestions_delete_admin" ON public.suggestions
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "organization_secrets_delete_admin" ON public.organization_secrets
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_item_addons_delete_admin" ON public.menu_item_addons
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "menu_item_ingredients_delete_admin" ON public.menu_item_ingredients
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "stock_items_delete_admin" ON public.stock_items
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "deliveries_delete_admin" ON public.deliveries
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "courier_shifts_delete_admin" ON public.courier_shifts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "couriers_delete_admin" ON public.couriers
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "fila_impressao_delete_admin" ON public.fila_impressao
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "device_tokens_delete_admin" ON public.device_tokens
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "whatsapp_instances_delete_admin" ON public.whatsapp_instances
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin SELECT policies for tables that need it
CREATE POLICY "whatsapp_instances_select_admin" ON public.whatsapp_instances
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "device_tokens_select_admin" ON public.device_tokens
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "organization_secrets_select_admin" ON public.organization_secrets
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cash_sessions_select_admin" ON public.cash_sessions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "cash_withdrawals_select_admin" ON public.cash_withdrawals
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
