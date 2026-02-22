ALTER TABLE public.couriers ADD COLUMN pix_key text DEFAULT NULL;

-- Allow couriers (unauthenticated) to update their own pix_key
CREATE POLICY "couriers_update_public"
ON public.couriers
FOR UPDATE
USING (true)
WITH CHECK (true);
