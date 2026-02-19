
-- Create tables (mesas)
CREATE TABLE public.tables (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number          integer NOT NULL,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tables_select_public" ON public.tables
  FOR SELECT USING (true);

CREATE POLICY "tables_insert_owner" ON public.tables
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = tables.organization_id)
  );

CREATE POLICY "tables_update_owner" ON public.tables
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = tables.organization_id)
  );

CREATE POLICY "tables_delete_owner" ON public.tables
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = tables.organization_id)
  );

-- Create orders
CREATE TABLE public.orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_number    integer NOT NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','delivered')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_public" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "orders_insert_public" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_update_owner" ON public.orders
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = orders.organization_id)
  );

CREATE POLICY "orders_delete_owner" ON public.orders
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = orders.organization_id)
  );

-- Create order_items
CREATE TABLE public.order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name         text NOT NULL,
  price        numeric(10,2) NOT NULL,
  quantity     integer NOT NULL DEFAULT 1
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_public" ON public.order_items
  FOR SELECT USING (true);

CREATE POLICY "order_items_insert_public" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_delete_owner" ON public.order_items
  FOR DELETE USING (
    auth.uid() = (
      SELECT o.user_id FROM public.organizations o
      JOIN public.orders ord ON ord.organization_id = o.id
      WHERE ord.id = order_items.order_id
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
