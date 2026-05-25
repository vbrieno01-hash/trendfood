DROP MATERIALIZED VIEW IF EXISTS public.top_stores_showcase;
CREATE MATERIALIZED VIEW public.top_stores_showcase AS
SELECT o.id, o.slug, o.name, o.logo_url, o.primary_color,
       count(ord.id)::integer AS order_count_30d
FROM organizations o
JOIN orders ord ON ord.organization_id = o.id
  AND ord.paid = true
  AND ord.created_at >= (now() - interval '30 days')
WHERE o.logo_url IS NOT NULL
  AND o.logo_url <> ''
  AND COALESCE(o.paused, false) = false
GROUP BY o.id, o.slug, o.name, o.logo_url, o.primary_color
HAVING count(ord.id) >= 3
ORDER BY count(ord.id) DESC
LIMIT 15;

REFRESH MATERIALIZED VIEW public.top_stores_showcase;