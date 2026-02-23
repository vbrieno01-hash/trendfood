
-- Create downloads bucket (public for anonymous downloads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('downloads', 'downloads', true);

-- Allow anyone to download (SELECT) from downloads bucket
CREATE POLICY "downloads_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'downloads');

-- Allow org owners to upload (INSERT) to downloads bucket
-- Files stored as: {org_id}/filename
CREATE POLICY "downloads_insert_owner"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'downloads'
  AND auth.uid() = (
    SELECT user_id FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow org owners to update files
CREATE POLICY "downloads_update_owner"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'downloads'
  AND auth.uid() = (
    SELECT user_id FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Allow org owners to delete files
CREATE POLICY "downloads_delete_owner"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'downloads'
  AND auth.uid() = (
    SELECT user_id FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
  )
);

-- Add URL columns to organizations
ALTER TABLE public.organizations
ADD COLUMN apk_url text,
ADD COLUMN exe_url text;
