-- Permitir UPDATE público no status dos pedidos (necessário para a tela da cozinha sem login)
-- A tela KDS é uma tela operacional pública acessada via ?org=slug
CREATE POLICY "orders_update_status_public"
ON public.orders
FOR UPDATE
USING (true)
WITH CHECK (true);