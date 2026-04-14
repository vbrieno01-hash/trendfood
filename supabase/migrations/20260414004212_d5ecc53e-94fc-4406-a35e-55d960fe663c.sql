
-- Allow owner to update order_items
CREATE POLICY "order_items_update_owner"
ON public.order_items
FOR UPDATE
USING (
  auth.uid() = (
    SELECT o.user_id FROM organizations o
    JOIN orders ord ON ord.organization_id = o.id
    WHERE ord.id = order_items.order_id
  )
);

-- Allow owner to insert items into their orders (any status)
CREATE POLICY "order_items_insert_owner"
ON public.order_items
FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT o.user_id FROM organizations o
    JOIN orders ord ON ord.organization_id = o.id
    WHERE ord.id = order_items.order_id
  )
);
