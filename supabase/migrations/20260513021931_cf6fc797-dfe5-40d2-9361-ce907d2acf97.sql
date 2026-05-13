DROP POLICY IF EXISTS order_items_insert_public_safe ON public.order_items;

CREATE POLICY order_items_insert_public_safe
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.created_at > now() - interval '10 minutes'
  )
);