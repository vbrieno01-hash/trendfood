
CREATE TABLE public.menu_item_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read addons" ON public.menu_item_addons
  FOR SELECT USING (true);

CREATE POLICY "Org owners manage addons" ON public.menu_item_addons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.organizations o ON o.id = mi.organization_id
      WHERE mi.id = menu_item_addons.menu_item_id
      AND o.user_id = auth.uid()
    )
  );
