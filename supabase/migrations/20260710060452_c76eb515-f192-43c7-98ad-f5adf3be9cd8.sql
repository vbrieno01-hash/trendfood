
-- ============================================================
-- Bloco 1: Lucro real por produto (últimos N dias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_profit_analysis(p_org_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  menu_item_id uuid,
  name text,
  quantity_sold bigint,
  revenue numeric,
  cost numeric,
  profit numeric,
  margin_pct numeric,
  has_recipe boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH valid_orders AS (
    SELECT id
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - make_interval(days => p_days)
  ),
  items AS (
    SELECT oi.menu_item_id, oi.name, oi.price, oi.quantity
    FROM order_items oi
    JOIN valid_orders vo ON vo.id = oi.order_id
    WHERE oi.menu_item_id IS NOT NULL
  ),
  costs AS (
    SELECT mi.menu_item_id, SUM(mi.quantity_used * COALESCE(si.cost_per_unit, 0))::numeric AS unit_cost
    FROM menu_item_ingredients mi
    LEFT JOIN stock_items si ON si.id = mi.stock_item_id
    GROUP BY mi.menu_item_id
  )
  SELECT
    i.menu_item_id,
    COALESCE(
      NULLIF(NULLIF(MAX(i.name), ''), '.'),
      NULLIF(NULLIF(MAX(m.name), ''), '.'),
      '(sem nome)'
    ) AS name,
    SUM(i.quantity)::bigint AS quantity_sold,
    SUM(i.quantity * i.price)::numeric AS revenue,
    SUM(i.quantity * COALESCE(c.unit_cost, 0))::numeric AS cost,
    (SUM(i.quantity * i.price) - SUM(i.quantity * COALESCE(c.unit_cost, 0)))::numeric AS profit,
    CASE WHEN SUM(i.quantity * i.price) > 0
      THEN ((SUM(i.quantity * i.price) - SUM(i.quantity * COALESCE(c.unit_cost, 0))) / SUM(i.quantity * i.price) * 100)::numeric
      ELSE 0
    END AS margin_pct,
    (c.unit_cost IS NOT NULL) AS has_recipe
  FROM items i
  LEFT JOIN menu_items m ON m.id = i.menu_item_id
  LEFT JOIN costs c ON c.menu_item_id = i.menu_item_id
  GROUP BY i.menu_item_id, c.unit_cost
  ORDER BY profit DESC;
$$;

GRANT EXECUTE ON FUNCTION public.intel_profit_analysis(uuid, integer) TO authenticated;

-- ============================================================
-- Bloco 2: Mapa de calor 7×24 (últimos N dias, horário Brasília UTC-3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_orders_heatmap(p_org_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (day_of_week integer, hour_of_day integer, order_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    EXTRACT(DOW FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS day_of_week,
    EXTRACT(HOUR FROM (created_at AT TIME ZONE 'America/Sao_Paulo'))::integer AS hour_of_day,
    COUNT(*)::bigint AS order_count
  FROM orders
  WHERE organization_id = p_org_id
    AND status <> 'cancelled'
    AND created_at >= now() - make_interval(days => p_days)
  GROUP BY day_of_week, hour_of_day;
$$;

GRANT EXECUTE ON FUNCTION public.intel_orders_heatmap(uuid, integer) TO authenticated;

-- ============================================================
-- Bloco 3: Previsão semanal (5 buckets: 4 anteriores + atual)
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_week_forecast(p_org_id uuid)
RETURNS TABLE (weeks_ago integer, revenue numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH this_week_start AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo')::timestamp AS wk
  ),
  lookback AS (
    SELECT (wk - interval '4 weeks') AS start_ts, wk FROM this_week_start
  ),
  valid_orders AS (
    SELECT o.id,
      FLOOR(EXTRACT(EPOCH FROM ((SELECT wk FROM this_week_start) - date_trunc('week', o.created_at AT TIME ZONE 'America/Sao_Paulo'))) / 604800)::integer AS wago
    FROM orders o, lookback l
    WHERE o.organization_id = p_org_id
      AND o.status <> 'cancelled'
      AND o.created_at >= l.start_ts
  ),
  order_totals AS (
    SELECT vo.wago, SUM(oi.price * oi.quantity)::numeric AS total
    FROM valid_orders vo
    JOIN order_items oi ON oi.order_id = vo.id
    WHERE vo.wago BETWEEN 0 AND 4
    GROUP BY vo.wago
  )
  SELECT wago AS weeks_ago, COALESCE(total, 0)::numeric AS revenue
  FROM generate_series(0, 4) AS wago
  LEFT JOIN order_totals USING (wago)
  ORDER BY wago;
$$;

GRANT EXECUTE ON FUNCTION public.intel_week_forecast(uuid) TO authenticated;

-- ============================================================
-- Bloco 4: Alertas inteligentes
-- ============================================================
CREATE OR REPLACE FUNCTION public.intel_smart_alerts(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_recent_rev numeric := 0;
  v_prior_rev numeric := 0;
  v_delta numeric := 0;
  v_idle jsonb := '[]'::jsonb;
  v_loyal_missing integer := 0;
  v_result jsonb := '{}'::jsonb;
BEGIN
  -- 1) Comparação 30d atuais vs 30d anteriores (usa 60d)
  WITH valid_orders AS (
    SELECT o.id, o.created_at
    FROM orders o
    WHERE o.organization_id = p_org_id
      AND o.status <> 'cancelled'
      AND o.created_at >= now() - interval '60 days'
  ),
  rev AS (
    SELECT vo.created_at, SUM(oi.price * oi.quantity)::numeric AS total
    FROM valid_orders vo
    JOIN order_items oi ON oi.order_id = vo.id
    GROUP BY vo.created_at
  )
  SELECT
    COALESCE(SUM(CASE WHEN created_at >= now() - interval '30 days' THEN total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN created_at < now() - interval '30 days' THEN total ELSE 0 END), 0)
  INTO v_recent_rev, v_prior_rev
  FROM rev;

  IF v_prior_rev > 0 THEN
    v_delta := ((v_recent_rev - v_prior_rev) / v_prior_rev) * 100;
  END IF;

  -- 2) Produtos parados (venderam entre 45-15d atrás, nada nos últimos 15d)
  WITH valid_orders AS (
    SELECT id, created_at
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '45 days'
  ),
  sold AS (
    SELECT oi.menu_item_id,
      MAX(oi.name) AS name,
      BOOL_OR(vo.created_at >= now() - interval '15 days') AS sold_recent,
      BOOL_OR(vo.created_at < now() - interval '15 days') AS sold_old
    FROM order_items oi
    JOIN valid_orders vo ON vo.id = oi.order_id
    WHERE oi.menu_item_id IS NOT NULL
    GROUP BY oi.menu_item_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', menu_item_id, 'name', COALESCE(NULLIF(name, ''), 'produto'))), '[]'::jsonb)
  INTO v_idle
  FROM (
    SELECT menu_item_id, name FROM sold
    WHERE sold_old AND NOT sold_recent
    LIMIT 3
  ) t;

  -- 3) Clientes fiéis sumidos (3+ pedidos em 90d, último há 20+ dias)
  WITH phones AS (
    SELECT
      regexp_replace(substring(notes FROM 'TEL:([^|]+)'), '\D', '', 'g') AS phone,
      created_at
    FROM orders
    WHERE organization_id = p_org_id
      AND status <> 'cancelled'
      AND created_at >= now() - interval '90 days'
      AND notes ~ 'TEL:'
  ),
  stats AS (
    SELECT phone, COUNT(*) AS cnt, MAX(created_at) AS last_at
    FROM phones
    WHERE length(phone) >= 8
    GROUP BY phone
  )
  SELECT COUNT(*)::integer INTO v_loyal_missing
  FROM stats
  WHERE cnt >= 3 AND last_at < now() - interval '20 days';

  v_result := jsonb_build_object(
    'recent_revenue', v_recent_rev,
    'prior_revenue', v_prior_rev,
    'revenue_delta_pct', v_delta,
    'idle_products', v_idle,
    'loyal_missing_count', v_loyal_missing
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.intel_smart_alerts(uuid) TO authenticated;
