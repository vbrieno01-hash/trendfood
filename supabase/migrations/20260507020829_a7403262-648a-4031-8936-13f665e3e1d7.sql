CREATE UNIQUE INDEX IF NOT EXISTS fila_impressao_one_pending_per_order
  ON public.fila_impressao (order_id)
  WHERE status = 'pendente' AND order_id IS NOT NULL;