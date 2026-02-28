
-- Tabela guide_screenshots
CREATE TABLE public.guide_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id text NOT NULL UNIQUE,
  image_url text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.guide_screenshots ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "guide_screenshots_select_public"
  ON public.guide_screenshots FOR SELECT
  USING (true);

-- Insert/Update/Delete apenas admins
CREATE POLICY "guide_screenshots_insert_admin"
  ON public.guide_screenshots FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "guide_screenshots_update_admin"
  ON public.guide_screenshots FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "guide_screenshots_delete_admin"
  ON public.guide_screenshots FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Bucket guide-images (público para leitura)
INSERT INTO storage.buckets (id, name, public) VALUES ('guide-images', 'guide-images', true);

-- Storage policies
CREATE POLICY "guide_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guide-images');

CREATE POLICY "guide_images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "guide_images_update_admin"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "guide_images_delete_admin"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));
