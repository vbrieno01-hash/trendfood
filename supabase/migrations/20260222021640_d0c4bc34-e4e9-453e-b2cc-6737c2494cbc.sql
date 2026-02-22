CREATE POLICY "fila_impressao_insert_public"
  ON public.fila_impressao
  FOR INSERT
  WITH CHECK (true);