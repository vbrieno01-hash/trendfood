-- Remove the view (linter flags views in API)
DROP VIEW IF EXISTS public.platform_config_public;

-- Restore public SELECT on platform_config (other code depends on it)
CREATE POLICY "platform_config_select_public"
ON public.platform_config FOR SELECT
USING (true);

-- But hide the admin token via column-level privilege
REVOKE SELECT (uazapi_admin_token) ON public.platform_config FROM anon, authenticated;
-- (admin reads it server-side via service_role / edge functions)