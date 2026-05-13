-- 1. Drop legacy public select policy
DROP POLICY IF EXISTS organizations_select_public ON public.organizations;

-- 2. Anon: row-level allow-all (column filtering enforced via GRANTs below)
DROP POLICY IF EXISTS public_can_view_basic_org_info ON public.organizations;
CREATE POLICY public_can_view_basic_org_info
ON public.organizations
FOR SELECT
TO anon
USING (true);

-- 3. Authenticated owner: full access to own org
DROP POLICY IF EXISTS users_can_view_own_org_full_data ON public.organizations;
CREATE POLICY users_can_view_own_org_full_data
ON public.organizations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. Admin: full access (idempotent)
DROP POLICY IF EXISTS organizations_select_admin ON public.organizations;
CREATE POLICY organizations_select_admin
ON public.organizations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Column-level restriction for anon role
REVOKE SELECT ON public.organizations FROM anon;

GRANT SELECT (
  id, name, slug, description, emoji, primary_color, logo_url, banner_url,
  whatsapp, business_hours, store_address, delivery_config, courier_config,
  pix_confirmation_mode, printer_width, print_mode, paused, force_open,
  subscription_status, subscription_plan, trial_ends_at,
  tax_regime, category_order, paused_categories, service_modes,
  category_emojis, theme_config, scheduling_config, created_at, user_id
) ON public.organizations TO anon;