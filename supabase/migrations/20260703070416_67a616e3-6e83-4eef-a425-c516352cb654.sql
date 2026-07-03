
-- Métricas do robô de IA para observabilidade
CREATE TABLE IF NOT EXISTS public.ai_bot_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  provider text,
  status text NOT NULL,
  latency_ms int,
  phone_hash text,
  reply_preview text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_bot_metrics TO authenticated;
GRANT ALL ON public.ai_bot_metrics TO service_role;

ALTER TABLE public.ai_bot_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads ai_bot_metrics"
  ON public.ai_bot_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS ai_bot_metrics_created_idx
  ON public.ai_bot_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_bot_metrics_org_created_idx
  ON public.ai_bot_metrics (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_bot_metrics_provider_created_idx
  ON public.ai_bot_metrics (provider, created_at DESC);

-- RPC: dashboard do robô (agregado por período)
CREATE OR REPLACE FUNCTION public.admin_bot_dashboard(_period text DEFAULT '24h')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _interval interval;
  _since timestamptz;
  _totals jsonb;
  _by_provider jsonb;
  _by_status jsonb;
  _top_orgs jsonb;
  _groq_blocked_until timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;

  _interval := CASE _period
    WHEN '7d'  THEN interval '7 days'
    WHEN '30d' THEN interval '30 days'
    ELSE interval '24 hours'
  END;
  _since := now() - _interval;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'errors', COUNT(*) FILTER (WHERE status IN ('ai_rate_limit','ai_unavailable','wa_send_failed','exception')),
    'duplicates', COUNT(*) FILTER (WHERE status = 'duplicate_reply_suppressed'),
    'avg_latency_ms', COALESCE(AVG(latency_ms)::int, 0)
  ) INTO _totals
  FROM public.ai_bot_metrics WHERE created_at >= _since;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _by_provider FROM (
    SELECT COALESCE(provider, 'unknown') AS provider,
           COUNT(*)::int AS count,
           COALESCE(AVG(latency_ms)::int, 0) AS avg_latency_ms
    FROM public.ai_bot_metrics
    WHERE created_at >= _since
    GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _by_status FROM (
    SELECT status, COUNT(*)::int AS count
    FROM public.ai_bot_metrics
    WHERE created_at >= _since
    GROUP BY 1 ORDER BY 2 DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO _top_orgs FROM (
    SELECT m.organization_id,
           COALESCE(o.name, '(desconhecida)') AS org_name,
           COUNT(*)::int AS count,
           COALESCE(AVG(m.latency_ms)::int, 0) AS avg_latency_ms
    FROM public.ai_bot_metrics m
    LEFT JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.created_at >= _since
    GROUP BY 1, 2
    ORDER BY 3 DESC
    LIMIT 10
  ) t;

  SELECT groq_blocked_until INTO _groq_blocked_until FROM public.platform_config LIMIT 1;

  RETURN jsonb_build_object(
    'period', _period,
    'since', _since,
    'totals', _totals,
    'by_provider', _by_provider,
    'by_status', _by_status,
    'top_orgs', _top_orgs,
    'groq_blocked_until', _groq_blocked_until,
    'groq_blocked', _groq_blocked_until IS NOT NULL AND _groq_blocked_until > now()
  );
END;
$$;

-- RPC: desbloquear Groq manualmente
CREATE OR REPLACE FUNCTION public.admin_unblock_groq()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.platform_config SET groq_blocked_until = NULL;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: últimas mensagens do bot (com telefone mascarado + nome da org)
CREATE OR REPLACE FUNCTION public.admin_bot_recent_messages(_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  organization_id uuid,
  org_name text,
  provider text,
  status text,
  latency_ms int,
  phone_hash text,
  reply_preview text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = 'P0001';
  END IF;
  RETURN QUERY
    SELECT m.id, m.created_at, m.organization_id,
           COALESCE(o.name, '(desconhecida)'),
           m.provider, m.status, m.latency_ms, m.phone_hash, m.reply_preview
    FROM public.ai_bot_metrics m
    LEFT JOIN public.organizations o ON o.id = m.organization_id
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 500);
END;
$$;
