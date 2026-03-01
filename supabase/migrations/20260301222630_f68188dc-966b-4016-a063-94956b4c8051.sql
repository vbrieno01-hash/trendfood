
-- Table for per-product exclusions of global addons
CREATE TABLE public.global_addon_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  global_addon_id uuid NOT NULL REFERENCES public.global_addons(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, global_addon_id)
);

ALTER TABLE public.global_addon_exclusions ENABLE ROW LEVEL SECURITY;

-- Owner can manage exclusions (via menu_items -> organizations)
CREATE POLICY "exclusions_all_owner"
ON public.global_addon_exclusions
FOR ALL
USING (
  auth.uid() = (
    SELECT o.user_id FROM organizations o
    JOIN menu_items mi ON mi.organization_id = o.id
    WHERE mi.id = global_addon_exclusions.menu_item_id
  )
);

-- Public can read (needed for client-facing menu)
CREATE POLICY "exclusions_select_public"
ON public.global_addon_exclusions
FOR SELECT
USING (true);

-- Admin can delete
CREATE POLICY "exclusions_delete_admin"
ON public.global_addon_exclusions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
