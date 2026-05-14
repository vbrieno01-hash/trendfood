CREATE INDEX IF NOT EXISTS idx_orders_org_status_created
  ON public.orders (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_org_created
  ON public.orders (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_org_table
  ON public.orders (organization_id, table_number);

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON public.orders (status, created_at DESC)
  WHERE status IN ('pending', 'preparing', 'ready', 'awaiting_payment');

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item
  ON public.order_items (menu_item_id)
  WHERE menu_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_push_order
  ON public.customer_push_subscriptions (order_id)
  WHERE order_id IS NOT NULL;

ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.customer_push_subscriptions;