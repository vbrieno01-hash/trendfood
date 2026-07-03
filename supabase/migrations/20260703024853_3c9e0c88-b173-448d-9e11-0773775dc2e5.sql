
-- 1) Libera o robô em todas as lojas existentes
UPDATE public.organizations
SET whatsapp_bot_allowed = true
WHERE whatsapp_bot_allowed = false;

-- 2) Novas lojas nascem com automáticas ligadas + templates padrão (mesmos da GBflix)
ALTER TABLE public.organizations
ALTER COLUMN wa_auto_status SET DEFAULT jsonb_build_object(
  'enabled', true,
  'templates', jsonb_build_object(
    'pending',          'Olá {nome}! 👋 Recebemos seu pedido #{numero} no valor de R$ {total}. Em instantes confirmamos. — {loja}',
    'preparing',        'Pedido #{numero} aceito! 🍳 Já estamos preparando. — {loja}',
    'awaiting_payment', 'Pedido #{numero}: aguardando confirmação do pagamento PIX. Assim que cair, começamos a preparar. — {loja}',
    'ready_pickup',     'Pedido #{numero} pronto! 🎉 Pode vir retirar quando quiser. — {loja}',
    'ready_delivery',   'Pedido #{numero} saiu pra entrega! 🛵 Chega em alguns minutos. — {loja}',
    'delivered',        'Pedido #{numero} entregue! Bom apetite 🍽️ Avalia a gente: {avaliacao_url} — {loja}',
    'cancelled',        'Pedido #{numero} cancelado. Em caso de dúvida, fale com a gente. — {loja}'
  )
);

-- 3) Reforço idempotente: qualquer loja com enabled=false volta para true
UPDATE public.organizations
SET wa_auto_status = jsonb_set(COALESCE(wa_auto_status, '{}'::jsonb), '{enabled}', 'true'::jsonb, true)
WHERE COALESCE((wa_auto_status->>'enabled')::boolean, false) = false;
