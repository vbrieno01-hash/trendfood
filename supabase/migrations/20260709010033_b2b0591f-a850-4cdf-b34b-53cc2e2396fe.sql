-- 1) Garantir role admin (defensivo — já confirmado que existe)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'brenojackson30@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Substituir policies hardcoded por has_role
DROP POLICY IF EXISTS "Platform admin manages addons" ON public.org_addons;
DROP POLICY IF EXISTS "Platform admin reads all addons" ON public.org_addons;

CREATE POLICY "Admin manages org_addons"
  ON public.org_addons
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));