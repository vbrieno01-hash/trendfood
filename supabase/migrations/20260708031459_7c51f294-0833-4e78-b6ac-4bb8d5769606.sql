CREATE OR REPLACE FUNCTION public.get_fiscal_public_status(_org_id uuid)
RETURNS TABLE(enabled boolean, producao_liberada boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(fc.enabled, false) AS enabled,
    COALESCE(fc.producao_liberada, false) AS producao_liberada
  FROM public.fiscal_config fc
  WHERE fc.organization_id = _org_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_fiscal_public_status(uuid) TO anon, authenticated;