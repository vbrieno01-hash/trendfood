-- Admin user management functions

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  ) t;

  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
  _orgs_deleted int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível deletar a própria conta' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email = 'brenojackson30@gmail.com' THEN
    RAISE EXCEPTION 'Não é possível deletar o admin principal' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.organizations WHERE user_id = _user_id;
  GET DIAGNOSTICS _orgs_deleted = ROW_COUNT;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;

  RETURN jsonb_build_object('success', true, 'email', _email, 'orgs_deleted', _orgs_deleted);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_admin_role(_user_id uuid, _grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _user_id;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _email = 'brenojackson30@gmail.com' THEN
      RAISE EXCEPTION 'Não é possível remover o admin principal' USING ERRCODE = 'P0001';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;

  RETURN jsonb_build_object('success', true, 'is_admin', _grant);
END;
$$;