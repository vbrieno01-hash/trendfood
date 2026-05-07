CREATE OR REPLACE FUNCTION public.resolve_affiliate_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.affiliates
  WHERE lower(code) = lower(_code) AND active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_affiliate_code(text) TO anon, authenticated;