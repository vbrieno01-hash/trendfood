-- 1) Corrige o merchant_id salvo: o iFood manda 40ea464f-... nos eventos
UPDATE public.ifood_credentials
SET merchant_id = '40ea464f-f89f-4255-8ec7-e138c2d49665',
    updated_at = now()
WHERE organization_id = 'c9d9db45-3e46-4b03-8a2e-7af4557c6a3e';

-- 2) Apaga logs órfãos do webhook (organization_id IS NULL) com event.id ocupando
-- o UNIQUE INDEX, pra liberar o reprocessamento desses pedidos perdidos
DELETE FROM public.ifood_event_log
WHERE organization_id IS NULL
  AND ifood_event_id IS NOT NULL
  AND (payload->>'merchantId') = '40ea464f-f89f-4255-8ec7-e138c2d49665';