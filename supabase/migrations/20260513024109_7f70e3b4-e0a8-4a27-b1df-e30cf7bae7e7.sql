CREATE POLICY "deliveries_update_distance_anon"
ON public.deliveries
FOR UPDATE
TO anon
USING (courier_id IS NULL AND status = 'pendente')
WITH CHECK (courier_id IS NULL AND status = 'pendente');