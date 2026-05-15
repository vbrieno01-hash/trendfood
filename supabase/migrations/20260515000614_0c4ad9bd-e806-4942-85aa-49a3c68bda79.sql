-- 1) Cleanup: para cada (organization_id, gateway_payment_id) iFood, manter o mais antigo e deletar os demais
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY organization_id, gateway_payment_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.orders
  WHERE gateway_payment_id LIKE 'ifood:%'
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.orders WHERE id IN (SELECT id FROM to_delete);

-- 2) Unique index parcial — barreira definitiva contra duplicação
CREATE UNIQUE INDEX IF NOT EXISTS orders_ifood_unique
  ON public.orders (organization_id, gateway_payment_id)
  WHERE gateway_payment_id LIKE 'ifood:%';