-- Fase 1 do Controle de Caixa: adiciona tipo (sangria/suprimento) e categoria
-- Aditivo puro: nenhuma coluna existente é modificada ou removida.

ALTER TABLE public.cash_withdrawals
  ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT 'sangria',
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Validação de valores permitidos em movement_type (via CHECK simples, imutável)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cash_withdrawals_movement_type_check'
  ) THEN
    ALTER TABLE public.cash_withdrawals
      ADD CONSTRAINT cash_withdrawals_movement_type_check
      CHECK (movement_type IN ('sangria','suprimento'));
  END IF;
END $$;

-- Índice pra filtrar rápido por tipo dentro de um turno
CREATE INDEX IF NOT EXISTS idx_cash_withdrawals_session_type
  ON public.cash_withdrawals (session_id, movement_type);

-- Comentários pra documentação
COMMENT ON COLUMN public.cash_withdrawals.movement_type IS 'sangria = saída, suprimento = entrada de dinheiro no caixa';
COMMENT ON COLUMN public.cash_withdrawals.category IS 'Categoria opcional: troco, fornecedor, retirada, despesa, outro';