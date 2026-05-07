CREATE UNIQUE INDEX IF NOT EXISTS fila_impressao_one_per_order
  ON public.fila_impressao (order_id)
  WHERE order_id IS NOT NULL;