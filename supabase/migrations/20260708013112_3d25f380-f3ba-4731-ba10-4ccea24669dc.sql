CREATE OR REPLACE FUNCTION public.fiscal_check_quota(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan TEXT;
  _quota INT;
  _overage_price INT;
  _overage_allowed BOOLEAN;
  _used INT := 0;
  _blocked BOOLEAN := false;
  _remaining INT;
  _reason TEXT := NULL;
  _caller uuid := auth.uid();
  _owner uuid;
BEGIN
  -- Blindagem: só dono da org, admin, ou chamada via service_role (auth.uid() nulo em edge functions com service key)
  IF _caller IS NOT NULL THEN
    SELECT user_id INTO _owner FROM public.organizations WHERE id = _org_id;
    IF _owner IS DISTINCT FROM _caller AND NOT public.has_role(_caller, 'admin') THEN
      RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
    END IF;
  END IF;

  _plan := public.get_effective_plan(_org_id);

  SELECT nfce_monthly_quota, nfce_overage_price_cents
    INTO _quota, _overage_price
  FROM public.platform_plans WHERE key = _plan;

  IF _plan = 'lifetime' THEN
    _quota := NULL;
  END IF;

  SELECT COALESCE(nfce_overage_allowed, false)
    INTO _overage_allowed
  FROM public.organizations WHERE id = _org_id;

  SELECT COALESCE(authorized_count, 0)
    INTO _used
  FROM public.fiscal_usage_current_month
  WHERE organization_id = _org_id;

  IF _quota IS NULL THEN
    _remaining := NULL;
    _blocked := false;
  ELSE
    _remaining := GREATEST(_quota - _used, 0);
    IF _used >= _quota THEN
      _blocked := true;
      _reason := CASE
        WHEN _quota = 0 THEN 'Plano ' || _plan || ' não inclui emissão de NFC-e. Faça upgrade.'
        ELSE 'Cota mensal de ' || _quota || ' notas atingida no plano ' || _plan || '.'
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'plan', _plan,
    'used', _used,
    'quota', _quota,
    'remaining', _remaining,
    'blocked', _blocked,
    'reason', _reason,
    'overage_allowed', COALESCE(_overage_allowed, false),
    'overage_price_cents', _overage_price
  );
END;
$function$;