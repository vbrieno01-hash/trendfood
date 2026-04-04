CREATE OR REPLACE FUNCTION public.get_total_order_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*) FROM orders; $$;

REVOKE EXECUTE ON FUNCTION public.get_total_order_count FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_total_order_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_order_count TO anon;