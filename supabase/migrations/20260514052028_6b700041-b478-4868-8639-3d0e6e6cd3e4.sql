
CREATE OR REPLACE FUNCTION public.get_platform_capacity_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _db_size bigint;
  _users_count bigint;
  _orgs_total bigint;
  _orgs_free bigint;
  _orgs_pro bigint;
  _orgs_enterprise bigint;
  _orgs_lifetime bigint;
  _orgs_trial_active bigint;
  _orders_total bigint;
  _orders_30d bigint;
  _top_tables jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT pg_database_size(current_database()) INTO _db_size;
  SELECT count(*) INTO _users_count FROM auth.users;

  SELECT
    count(*),
    count(*) FILTER (WHERE subscription_plan = 'free'),
    count(*) FILTER (WHERE subscription_plan = 'pro'),
    count(*) FILTER (WHERE subscription_plan = 'enterprise'),
    count(*) FILTER (WHERE subscription_plan = 'lifetime'),
    count(*) FILTER (WHERE subscription_plan = 'free' AND trial_ends_at IS NOT NULL AND trial_ends_at > now())
  INTO _orgs_total, _orgs_free, _orgs_pro, _orgs_enterprise, _orgs_lifetime, _orgs_trial_active
  FROM public.organizations;

  SELECT count(*), count(*) FILTER (WHERE created_at >= now() - interval '30 days')
  INTO _orders_total, _orders_30d
  FROM public.orders;

  SELECT jsonb_agg(t)
  INTO _top_tables
  FROM (
    SELECT
      relname AS table_name,
      pg_total_relation_size(C.oid) AS size_bytes,
      pg_size_pretty(pg_total_relation_size(C.oid)) AS size_pretty
    FROM pg_class C
    LEFT JOIN pg_namespace N ON N.oid = C.relnamespace
    WHERE nspname = 'public' AND C.relkind = 'r'
    ORDER BY pg_total_relation_size(C.oid) DESC
    LIMIT 8
  ) t;

  _result := jsonb_build_object(
    'db_size_bytes', _db_size,
    'users_count', _users_count,
    'orgs_total', _orgs_total,
    'orgs_free', _orgs_free,
    'orgs_pro', _orgs_pro,
    'orgs_enterprise', _orgs_enterprise,
    'orgs_lifetime', _orgs_lifetime,
    'orgs_trial_active', _orgs_trial_active,
    'orders_total', _orders_total,
    'orders_30d', _orders_30d,
    'top_tables', COALESCE(_top_tables, '[]'::jsonb),
    'generated_at', now()
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_capacity_stats() TO authenticated;
