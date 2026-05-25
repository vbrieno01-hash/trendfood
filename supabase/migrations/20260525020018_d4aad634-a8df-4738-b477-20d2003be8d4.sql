CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      GREATEST(
        COALESCE(act.last_order_at, 'epoch'::timestamptz),
        COALESCE(act.last_org_update, 'epoch'::timestamptz),
        COALESCE(u.last_sign_in_at, 'epoch'::timestamptz)
      ) AS last_activity_at,
      COALESCE(u.raw_app_meta_data->>'provider', 'email') AS provider,
      COALESCE(o.org_count, 0) AS org_count,
      COALESCE(o.org_names, ARRAY[]::text[]) AS org_names,
      EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') AS is_admin
    FROM auth.users u
    LEFT JOIN (
      SELECT user_id, count(*)::int AS org_count, array_agg(name) AS org_names
      FROM public.organizations
      GROUP BY user_id
    ) o ON o.user_id = u.id
    LEFT JOIN (
      SELECT org.user_id,
             MAX(ord.created_at) AS last_order_at,
             MAX(org.updated_at) AS last_org_update
      FROM public.organizations org
      LEFT JOIN public.orders ord ON ord.organization_id = org.id
      GROUP BY org.user_id
    ) act ON act.user_id = u.id
  ) t;

  RETURN _result;
END;
$function$;