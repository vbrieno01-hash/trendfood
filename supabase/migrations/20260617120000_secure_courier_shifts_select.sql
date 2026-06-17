-- ══════════════════════════════════════════════════════════
-- MIGRATION: fechar SELECT público em courier_shifts
-- Substitui acesso direto por 2 RPCs SECURITY DEFINER
-- ══════════════════════════════════════════════════════════

-- 1) RPC para o motoboy (anon) buscar seu próprio turno ativo
CREATE OR REPLACE FUNCTION public.courier_get_active_shift(_courier_id uuid)
RETURNS TABLE (
  id              uuid,
  courier_id      uuid,
  organization_id uuid,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_at      timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Valida que o courier existe (impede enumeração de turnos)
  IF NOT EXISTS (SELECT 1 FROM public.couriers WHERE id = _courier_id) THEN
    RAISE EXCEPTION 'Courier not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT cs.id, cs.courier_id, cs.organization_id,
           cs.started_at, cs.ended_at, cs.created_at
    FROM public.courier_shifts cs
    WHERE cs.courier_id = _courier_id
      AND cs.ended_at IS NULL
    ORDER BY cs.started_at DESC
    LIMIT 1;
END; $$;

REVOKE ALL ON FUNCTION public.courier_get_active_shift(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_get_active_shift(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────

-- 2) RPC para o motoboy (anon) buscar total de turnos + diárias
CREATE OR REPLACE FUNCTION public.courier_get_shift_stats(_courier_id uuid)
RETURNS TABLE (
  total_shifts       bigint,
  total_daily_earned numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.couriers WHERE id = _courier_id) THEN
    RAISE EXCEPTION 'Courier not found' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT
      COUNT(cs.id)::bigint AS total_shifts,
      COALESCE(SUM(
        COALESCE((o.courier_config->>'daily_rate')::numeric, 0)
      ), 0) AS total_daily_earned
    FROM public.courier_shifts cs
    JOIN public.organizations o ON o.id = cs.organization_id
    WHERE cs.courier_id = _courier_id
      AND cs.ended_at IS NOT NULL;
END; $$;

REVOKE ALL ON FUNCTION public.courier_get_shift_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_get_shift_stats(uuid) TO anon, authenticated;

-- ──────────────────────────────────────────────────────────

-- 3) Nova policy: SELECT apenas para lojista autenticado
DROP POLICY IF EXISTS courier_shifts_select_owner ON public.courier_shifts;
CREATE POLICY courier_shifts_select_owner
ON public.courier_shifts FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT id FROM public.organizations WHERE user_id = auth.uid()
  )
);

-- 4) Remove o SELECT aberto a qualquer anon
DROP POLICY IF EXISTS courier_shifts_select_public ON public.courier_shifts;
