-- 1. Drop public select policy
DROP POLICY IF EXISTS couriers_select_public ON public.couriers;

-- 2. Owner / admin select policies (idempotent)
DROP POLICY IF EXISTS authenticated_users_view_couriers ON public.couriers;
CREATE POLICY authenticated_users_view_couriers
ON public.couriers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = couriers.organization_id
      AND o.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS couriers_select_admin ON public.couriers;
CREATE POLICY couriers_select_admin
ON public.couriers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Column-level restriction for anon role
REVOKE SELECT ON public.couriers FROM anon;
GRANT SELECT (id, name, plate) ON public.couriers TO anon;

-- 4. SECURITY DEFINER RPC for courier login by phone
CREATE OR REPLACE FUNCTION public.courier_login_by_phone(
  phone_input text,
  org_id uuid DEFAULT NULL
)
RETURNS SETOF public.couriers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.couriers
  WHERE active = true
    AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(phone_input, '\D', '', 'g')
    AND (org_id IS NULL OR organization_id = org_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.courier_login_by_phone(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_login_by_phone(text, uuid) TO anon, authenticated;

-- 5. SECURITY DEFINER RPC for courier to fetch own profile after login
CREATE OR REPLACE FUNCTION public.courier_get_self(courier_id uuid)
RETURNS SETOF public.couriers
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.couriers WHERE id = courier_id LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.courier_get_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_get_self(uuid) TO anon, authenticated;