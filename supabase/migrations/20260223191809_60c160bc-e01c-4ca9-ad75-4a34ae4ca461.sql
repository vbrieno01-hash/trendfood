
-- Add global download URLs to platform_config
ALTER TABLE public.platform_config ADD COLUMN apk_url text;
ALTER TABLE public.platform_config ADD COLUMN exe_url text;

-- Storage policy: admins can upload to global/ path
CREATE POLICY "admin_upload_global"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'downloads'
  AND (storage.foldername(name))[1] = 'global'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Storage policy: admins can update global/ files
CREATE POLICY "admin_update_global"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'downloads'
  AND (storage.foldername(name))[1] = 'global'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
