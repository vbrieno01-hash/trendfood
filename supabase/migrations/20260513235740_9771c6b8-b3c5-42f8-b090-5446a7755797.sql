-- Materialized view com top 15 lojas por número de pedidos pagos nos últimos 30 dias
CREATE MATERIALIZED VIEW IF NOT EXISTS public.top_stores_showcase AS
SELECT
  o.id,
  o.slug,
  o.name,
  o.logo_url,
  o.primary_color,
  COUNT(ord.id)::int AS order_count_30d
FROM public.organizations o
JOIN public.orders ord
  ON ord.organization_id = o.id
 AND ord.paid = true
 AND ord.created_at >= now() - interval '30 days'
WHERE o.logo_url IS NOT NULL
  AND o.logo_url <> ''
  AND COALESCE(o.paused, false) = false
GROUP BY o.id, o.slug, o.name, o.logo_url, o.primary_color
HAVING COUNT(ord.id) >= 5
ORDER BY COUNT(ord.id) DESC
LIMIT 15;

CREATE UNIQUE INDEX IF NOT EXISTS top_stores_showcase_id_idx
  ON public.top_stores_showcase (id);

-- Função pública pra ler (evita expor MV diretamente via PostgREST)
CREATE OR REPLACE FUNCTION public.get_top_stores_showcase()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  logo_url text,
  primary_color text,
  order_count_30d int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, slug, name, logo_url, primary_color, order_count_30d
  FROM public.top_stores_showcase
  ORDER BY order_count_30d DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_stores_showcase() TO anon, authenticated;

-- Função de refresh (registra em cron_health pro watchdog)
CREATE OR REPLACE FUNCTION public.refresh_top_stores_showcase()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count int;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.top_stores_showcase;
  SELECT COUNT(*) INTO _count FROM public.top_stores_showcase;

  INSERT INTO cron_health (job_name, last_success_at, last_run_count)
  VALUES ('refresh_top_stores_showcase', now(), _count)
  ON CONFLICT (job_name) DO UPDATE
    SET last_success_at = EXCLUDED.last_success_at,
        last_run_count  = EXCLUDED.last_run_count;
END;
$$;

-- Agendar refresh a cada 1h
SELECT cron.schedule(
  'refresh-top-stores-showcase',
  '0 * * * *',
  $$ SELECT public.refresh_top_stores_showcase(); $$
);