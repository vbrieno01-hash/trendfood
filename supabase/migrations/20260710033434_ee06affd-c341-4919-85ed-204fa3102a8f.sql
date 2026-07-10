
-- 1) Realtime pra campaign_credits (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'campaign_credits'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_credits';
  END IF;
END $$;

ALTER TABLE public.campaign_credits REPLICA IDENTITY FULL;

-- 2) RPC pra somar créditos e estender vigência de forma atômica
CREATE OR REPLACE FUNCTION public.apply_campaign_credits_purchase(
  _org_id UUID,
  _credits INT DEFAULT 250,
  _days INT DEFAULT 30,
  _payment_id TEXT DEFAULT NULL
)
RETURNS public.campaign_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.campaign_credits;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_row
  FROM public.campaign_credits
  WHERE organization_id = _org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.campaign_credits (
      organization_id, plan_id, credits_total, credits_used,
      period_start, period_end, status
    ) VALUES (
      _org_id, 'basic_250', _credits, 0,
      v_now, v_now + make_interval(days => _days), 'active'
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.campaign_credits
    SET
      credits_total = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN credits_total + _credits
        ELSE _credits
      END,
      credits_used = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN credits_used
        ELSE 0
      END,
      period_start = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN period_start
        ELSE v_now
      END,
      period_end = CASE
        WHEN status = 'active' AND period_end > v_now
          THEN period_end + make_interval(days => _days)
        ELSE v_now + make_interval(days => _days)
      END,
      status = 'active',
      updated_at = v_now
    WHERE organization_id = _org_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_campaign_credits_purchase(UUID, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_campaign_credits_purchase(UUID, INT, INT, TEXT) TO service_role;
