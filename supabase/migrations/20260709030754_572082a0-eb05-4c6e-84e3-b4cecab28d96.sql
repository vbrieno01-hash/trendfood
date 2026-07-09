-- Fase 2 do Controle de Caixa: rastreabilidade de operador + divergência
-- 100% aditivo. Colunas nullable. Nada existente é modificado.

ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS opened_by UUID,
  ADD COLUMN IF NOT EXISTS closed_by UUID,
  ADD COLUMN IF NOT EXISTS divergence_reason TEXT;

COMMENT ON COLUMN public.cash_sessions.opened_by IS 'auth.users.id do operador que abriu o turno';
COMMENT ON COLUMN public.cash_sessions.closed_by IS 'auth.users.id do operador que fechou o turno';
COMMENT ON COLUMN public.cash_sessions.divergence_reason IS 'Justificativa quando a diferença esperado x contado ultrapassa o limite';

-- Index útil pra buscar todos os turnos de um operador
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by
  ON public.cash_sessions (opened_by)
  WHERE opened_by IS NOT NULL;