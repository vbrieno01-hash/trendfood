DROP POLICY IF EXISTS deliveries_select_public ON public.deliveries;

DROP POLICY IF EXISTS users_can_select_their_org_deliveries ON public.deliveries;
CREATE POLICY users_can_select_their_org_deliveries
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deliveries_select_admin ON public.deliveries;
CREATE POLICY deliveries_select_admin
ON public.deliveries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));