
-- Admin INSERT/UPDATE policies for menu_items
CREATE POLICY "menu_items_insert_admin" ON public.menu_items FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "menu_items_update_admin" ON public.menu_items FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE/SELECT policies for coupons
CREATE POLICY "coupons_insert_admin" ON public.coupons FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "coupons_update_admin" ON public.coupons FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "coupons_select_admin" ON public.coupons FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for stock_items
CREATE POLICY "stock_items_insert_admin" ON public.stock_items FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "stock_items_update_admin" ON public.stock_items FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for cash_sessions
CREATE POLICY "cash_sessions_insert_admin" ON public.cash_sessions FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cash_sessions_update_admin" ON public.cash_sessions FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT policy for cash_withdrawals
CREATE POLICY "cash_withdrawals_insert_admin" ON public.cash_withdrawals FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "cash_withdrawals_update_admin" ON public.cash_withdrawals FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for delivery_neighborhoods
CREATE POLICY "delivery_neighborhoods_insert_admin" ON public.delivery_neighborhoods FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "delivery_neighborhoods_update_admin" ON public.delivery_neighborhoods FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for tables
CREATE POLICY "tables_insert_admin" ON public.tables FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tables_update_admin" ON public.tables FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin UPDATE policy for orders
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for global_addons
CREATE POLICY "global_addons_insert_admin" ON public.global_addons FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "global_addons_update_admin" ON public.global_addons FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE policies for menu_item_ingredients
CREATE POLICY "menu_item_ingredients_insert_admin" ON public.menu_item_ingredients FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "menu_item_ingredients_update_admin" ON public.menu_item_ingredients FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT/UPDATE/DELETE policies for menu_item_addons
CREATE POLICY "menu_item_addons_insert_admin" ON public.menu_item_addons FOR INSERT TO public WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "menu_item_addons_update_admin" ON public.menu_item_addons FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
