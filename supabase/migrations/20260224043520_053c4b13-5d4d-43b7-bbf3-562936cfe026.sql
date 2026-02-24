
-- Enable realtime for fila_whatsapp
ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_whatsapp;

-- Drop restrictive SELECT policy and add admin SELECT
DROP POLICY IF EXISTS "fila_whatsapp_select_none" ON public.fila_whatsapp;
CREATE POLICY "fila_whatsapp_select_admin"
ON public.fila_whatsapp
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
