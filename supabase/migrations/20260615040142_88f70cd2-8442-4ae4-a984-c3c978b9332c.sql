DROP POLICY IF EXISTS "order_items_select_public" ON public.order_items;

DROP POLICY IF EXISTS "order_items_select_owner" ON public.order_items;

CREATE POLICY "order_items_select_owner" ON public.order_items FOR SELECT TO authenticated USING ( auth.uid() = ( SELECT o.user_id FROM public.organizations o JOIN public.orders ord ON ord.organization_id = o.id WHERE ord.id = order_items.order_id ) );