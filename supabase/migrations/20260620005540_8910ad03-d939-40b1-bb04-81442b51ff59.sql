-- 1) Master Uazapi credentials in platform_config
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS uazapi_server_url text,
  ADD COLUMN IF NOT EXISTS uazapi_admin_token text;

-- 2) Per-store gate
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS whatsapp_bot_allowed boolean NOT NULL DEFAULT false;

-- 3) Restrict platform_config public SELECT (token must not leak).
-- Drop old public SELECT and replace by a column-safe RLS approach:
DROP POLICY IF EXISTS "platform_config_select_public" ON public.platform_config;
DROP POLICY IF EXISTS "platform_config_select_admin" ON public.platform_config;

-- Admin can see everything (including uazapi_admin_token)
CREATE POLICY "platform_config_select_admin"
ON public.platform_config FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public/authenticated read via a safe view (no token exposed)
CREATE OR REPLACE VIEW public.platform_config_public AS
SELECT
  id,
  delivery_config,
  apk_url,
  exe_url,
  default_trial_days,
  ifood_enabled,
  whatsapp_enabled,
  uazapi_server_url,
  (uazapi_admin_token IS NOT NULL AND length(uazapi_admin_token) > 0) AS uazapi_configured,
  created_at,
  updated_at
FROM public.platform_config;

GRANT SELECT ON public.platform_config_public TO anon, authenticated;

-- 4) RPC for admin to toggle per-store flag
CREATE OR REPLACE FUNCTION public.admin_set_whatsapp_bot_allowed(_org_id uuid, _allowed boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.organizations
     SET whatsapp_bot_allowed = _allowed
   WHERE id = _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_whatsapp_bot_allowed(uuid, boolean) TO authenticated;

-- 5) RPC for any logged user to read whether their own org may use the bot
CREATE OR REPLACE FUNCTION public.get_whatsapp_bot_allowed(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(whatsapp_bot_allowed, false)
  FROM public.organizations
  WHERE id = _org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_whatsapp_bot_allowed(uuid) TO authenticated, anon;