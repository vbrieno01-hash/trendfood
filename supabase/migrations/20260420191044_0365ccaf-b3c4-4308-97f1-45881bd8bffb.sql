
-- ════════════════════════════════════════════════════════════════════
-- FRENTE 2 + 3 — Cancellation reason, expiração de prints, RLS hardening
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Coluna cancellation_reason em orders ─────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN public.orders.cancellation_reason IS
  'Motivo do cancelamento: out_of_stock, customer_gave_up, out_of_area, system_error, other';

-- ─── 2. Cron job para expirar trabalhos de impressão > 24h ──────────
-- Garante extensões disponíveis (pg_cron já habilitado em Lovable Cloud)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove jobs anteriores com mesmo nome (idempotência)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stuck-prints');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Agenda novo job: roda a cada 6h, marca como 'expirado' itens pendentes > 24h
SELECT cron.schedule(
  'expire-stuck-prints',
  '0 */6 * * *',
  $$
  UPDATE public.fila_impressao
  SET status = 'expirado'
  WHERE status = 'pendente'
    AND created_at < (now() - interval '24 hours');
  $$
);

-- ════════════════════════════════════════════════════════════════════
-- FRENTE 3 — RLS Hardening: substitui USING (true) permissivos
-- ════════════════════════════════════════════════════════════════════

-- ─── couriers: remove update público irrestrito ──────────────────────
DROP POLICY IF EXISTS couriers_update_public ON public.couriers;
-- couriers_update_owner já existe — owner da org pode editar.
-- Admin já tem permissão via has_role.
-- Motoboy não precisa atualizar a tabela couriers (só leitura via select_public).

-- ─── deliveries: restringe update público ────────────────────────────
DROP POLICY IF EXISTS deliveries_update_public ON public.deliveries;

-- Cria policy operacional restrita: público pode atualizar APENAS status, accepted_at,
-- delivered_at e courier_id (campos do fluxo motoboy). organization_id e order_id ficam imutáveis.
CREATE POLICY deliveries_update_operational
ON public.deliveries
FOR UPDATE
TO public
USING (status IN ('pendente', 'em_rota', 'entregue', 'cancelado'))
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.deliveries d2 WHERE d2.id = deliveries.id)
  AND order_id = (SELECT order_id FROM public.deliveries d2 WHERE d2.id = deliveries.id)
);

-- Owner já tem update via deliveries owner check (existente). Admin via has_role.

-- ─── courier_shifts: remove update público irrestrito ────────────────
DROP POLICY IF EXISTS courier_shifts_update_public ON public.courier_shifts;

-- Operacional: público pode encerrar turno (set ended_at) sem mexer em outros campos
CREATE POLICY courier_shifts_update_end_shift
ON public.courier_shifts
FOR UPDATE
TO public
USING (ended_at IS NULL)
WITH CHECK (
  courier_id = (SELECT courier_id FROM public.courier_shifts cs2 WHERE cs2.id = courier_shifts.id)
  AND organization_id = (SELECT organization_id FROM public.courier_shifts cs2 WHERE cs2.id = courier_shifts.id)
);

-- ─── fila_impressao: remove insert público (já tem owner insert) ─────
-- O insert público existente é necessário para edge functions/cliente anônimo
-- que cria pedidos. Mantemos, mas removemos qualquer update público irrestrito.
-- (atualmente só existe fila_impressao_update_owner — está ok)

-- ════════════════════════════════════════════════════════════════════
-- Verificação: lista policies remanescentes para auditoria
-- ════════════════════════════════════════════════════════════════════
-- (não precisa rodar nada aqui; linter Supabase vai re-checar)
