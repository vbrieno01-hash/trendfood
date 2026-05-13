DROP POLICY IF EXISTS deliveries_update_operational ON public.deliveries;

DROP POLICY IF EXISTS authenticated_users_update_operational ON public.deliveries;
CREATE POLICY authenticated_users_update_operational
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deliveries_update_admin ON public.deliveries;
CREATE POLICY deliveries_update_admin
ON public.deliveries
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));