
-- 1. Add whatsapp column to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS whatsapp text;

-- 2. Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  price           numeric(10,2) NOT NULL,
  category        text NOT NULL DEFAULT 'Outros',
  image_url       text,
  available       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on menu_items
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for menu_items
-- Public read
CREATE POLICY "menu_items_select_public"
  ON public.menu_items FOR SELECT
  USING (true);

-- Owner insert
CREATE POLICY "menu_items_insert_owner"
  ON public.menu_items FOR INSERT
  WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM public.organizations WHERE id = organization_id
    )
  );

-- Owner update
CREATE POLICY "menu_items_update_owner"
  ON public.menu_items FOR UPDATE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.organizations WHERE id = organization_id
    )
  );

-- Owner delete
CREATE POLICY "menu_items_delete_owner"
  ON public.menu_items FOR DELETE
  USING (
    auth.uid() = (
      SELECT user_id FROM public.organizations WHERE id = organization_id
    )
  );

-- 5. Create menu-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS policies for menu-images
CREATE POLICY "menu_images_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "menu_images_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "menu_images_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "menu_images_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- 7. Enable realtime for menu_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
