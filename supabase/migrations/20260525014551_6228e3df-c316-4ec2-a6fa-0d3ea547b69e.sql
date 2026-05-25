DROP FUNCTION IF EXISTS public.get_top_stores_showcase();

DROP MATERIALIZED VIEW IF EXISTS public.top_stores_showcase;

CREATE MATERIALIZED VIEW public.top_stores_showcase AS
SELECT o.id,
       o.slug,
       o.name,
       o.logo_url,
       o.primary_color,
       COALESCE(o.paused, false) AS paused,
       count(ord.id)::integer AS order_count_total
FROM organizations o
JOIN orders ord ON ord.organization_id = o.id AND ord.paid = true
WHERE o.logo_url IS NOT NULL AND o.logo_url <> ''
GROUP BY o.id, o.slug, o.name, o.logo_url, o.primary_color, o.paused
ORDER BY count(ord.id) DESC
LIMIT 10;

CREATE UNIQUE INDEX top_stores_showcase_id_idx ON public.top_stores_showcase (id);

REFRESH MATERIALIZED VIEW public.top_stores_showcase;

CREATE FUNCTION public.get_top_stores_showcase()
RETURNS TABLE(id uuid, slug text, name text, logo_url text, primary_color text, paused boolean, order_count_total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, slug, name, logo_url, primary_color, paused, order_count_total
  FROM public.top_stores_showcase
  ORDER BY order_count_total DESC;
$$;