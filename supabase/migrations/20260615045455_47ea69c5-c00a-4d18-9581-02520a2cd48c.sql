-- Etapa 3: fechar SELECT público em loyalty_config / loyalty_points

-- loyalty_config -------------------------------------------------
DROP POLICY IF EXISTS loyalty_config_select_public ON public.loyalty_config;

CREATE POLICY loyalty_config_select_owner
ON public.loyalty_config
FOR SELECT
TO authenticated
USING (
  auth.uid() = (
    SELECT organizations.user_id
    FROM public.organizations
    WHERE organizations.id = loyalty_config.organization_id
  )
);

CREATE POLICY loyalty_config_select_admin
ON public.loyalty_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- loyalty_points -------------------------------------------------
DROP POLICY IF EXISTS loyalty_points_select_public ON public.loyalty_points;

CREATE POLICY loyalty_points_select_owner
ON public.loyalty_points
FOR SELECT
TO authenticated
USING (
  auth.uid() = (
    SELECT organizations.user_id
    FROM public.organizations
    WHERE organizations.id = loyalty_points.organization_id
  )
);

CREATE POLICY loyalty_points_select_admin
ON public.loyalty_points
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));