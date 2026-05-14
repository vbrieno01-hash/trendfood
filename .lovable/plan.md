# Corrigir erro ao aceitar pedido no KDS

## Objetivo
Restaurar o fluxo de aceite de pedidos na cozinha para que o pedido mude para `preparing` sem erro e as automações de mensagem voltem a funcionar.

## O que vou fazer
1. Corrigir a função do banco `wa_enqueue_status()` para não depender da coluna `orders.total`, que não existe no schema atual.
2. Recalcular o valor do pedido a partir de `order_items` (ou aplicar fallback seguro para `0,00`) dentro da própria função SQL, sem quebrar o update de status.
3. Preservar o trigger `trg_orders_wa_auto_status`, já que ele ainda é o responsável por enfileirar mensagens automáticas ao mudar o status do pedido.
4. Validar que o clique em `Aceitar Pedido` volta a atualizar a linha em `orders` e que a fila `whatsapp_outbox` passa a receber registros novamente quando houver telefone e template configurados.
5. Revisar se existe algum outro ponto do fluxo assumindo `orders.total` para evitar regressão parecida.

## Resultado esperado
- O toast vermelho `record "v_order" has no field "total"` desaparece.
- O pedido sai de `pending` para `preparing` normalmente.
- As mensagens automáticas de status voltam a ser enfileiradas.
- O fluxo manual de WhatsApp do KDS deixa de ser bloqueado pelo erro do banco.

## Detalhes técnicos
- O erro acontece no trigger `trg_orders_wa_auto_status`.
- Esse trigger chama `public.wa_enqueue_status(p_org_id, p_order_id, p_event)`.
- A função usa `v_order orders%ROWTYPE` e tenta acessar `v_order.total`, mas a tabela `public.orders` não possui essa coluna no schema atual.
- Como a função roda durante o `UPDATE` do pedido, o Postgres aborta a mudança de status inteira.

## Arquivos / áreas que serão afetados
- Nova migration SQL em `supabase/migrations/...`
- Possível revisão rápida em `src/components/dashboard/KitchenTab.tsx` e/ou `src/hooks/useOrders.ts` apenas para confirmar que o frontend já trata o erro corretamente e não precisa de ajuste extra

## Validação
1. Aceitar um pedido no KDS.
2. Confirmar que o pedido muda de coluna/estado.
3. Confirmar que não aparece mais o erro vermelho.
4. Conferir se surgem entradas em `whatsapp_outbox` para eventos elegíveis.
5. Conferir que os outros triggers de `orders` continuam funcionando.