## Objetivo

Fazer o painel do iFood marcar **"Entrega confirmada"** quando um pedido de entrega própria vira `delivered` na sua Produção. Hoje sai `0 de 4` porque falta uma chamada e o body do dispatch tá incompleto.

## Diagnóstico (já validado)

Doc oficial iFood (`https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/endpoints`):

- `POST /orders/{id}/dispatch` exige body `{"deliveredBy":"MERCHANT"}` para entrega própria. Hoje enviamos **sem body**.
- Pra fechar o ciclo, entrega própria precisa de `POST /orders/{id}/verifyDeliveryCode` com `{"code":"<localizador>"}`. O **localizador** é o campo `phone.localizer` do pedido — é o número "5509 5648" que aparece no painel iFood. Hoje essa edge existe (`ifood-verify-delivery-code`) mas só é chamada manualmente.

Confirmação no banco: os 4 pedidos de teste estão com `ifood_dispatched_at` preenchido e `ifood_concluded_at` ainda `null`. Bate com o sintoma do painel.

## Escopo

**Só pedidos iFood** (`gateway_payment_id LIKE 'ifood:%'`). Pedidos WhatsApp, balcão, mesa, PIX, MP — **nenhum** é tocado. Zero impacto em produção pra quem não usa iFood.

## O que muda

### 1. Persistir o localizador quando o pedido entra (`ifood-poll-events`)

Hoje a edge salva `ifood_order_type`, `ifood_display_id`, etc. mas não guarda `phone.localizer`. Adiciono:
- Coluna nova `ifood_delivery_localizer TEXT NULL` na tabela `orders`.
- No parsing do pedido novo, extrair `order.phone?.localizer` e salvar.
- Backfill opcional: na próxima leitura de detalhe via API, preencher se faltar.

### 2. Dispatch com body correto (`ifood-update-status`)

Trocar:
```ts
{ path: "dispatch", markField: "ifood_dispatched_at", ... }
```
por:
```ts
{ path: "dispatch", body: { deliveredBy: "MERCHANT" }, markField: "ifood_dispatched_at", ... }
```

### 3. Confirmar entrega ao virar `delivered` (entrega própria iFood)

No `actionsForStatus` (case `delivered`, ramo DELIVERY): além do dispatch, adicionar uma segunda ação encadeada:
```ts
{ path: "verifyDeliveryCode", body: { code: <localizer> }, markField: "ifood_concluded_at", skipIfFieldSet: "ifood_concluded_at" }
```

Regras de segurança:
- Só dispara se `ifood_delivery_localizer` estiver preenchido. Sem localizador → pula e loga (não quebra o fluxo).
- Idempotente: se `ifood_concluded_at` já existe, pula.
- Se a chamada falhar (4xx/5xx), o pedido **continua marcado como `delivered`** localmente — só o status no iFood não fecha. Não bloqueia nada na sua loja.

### 4. Bug colateral: `"ifood-n"` quebrado

Encontrei em 2 arquivos do frontend chamadas para uma edge inexistente `"ifood-n"`:
- `src/pages/CourierPage.tsx`
- `src/components/admin/IFoodHomologacaoTab.tsx`

E dentro de `supabase/functions/ifood-verify-delivery-code/index.ts` o path do fetch tá como `/orders/${ifoodOrderId}/n` (deveria ser `verifyDeliveryCode`).

Corrigir todos os 3 para o nome certo. Isso já estava quebrado independente da homologação — entregadores tentando validar código falhavam silenciosamente.

## Risco

- **Lojas sem iFood**: nada muda. Código todo gated por `gateway_payment_id LIKE 'ifood:%'`.
- **Lojas com iFood**: dispatch passa a enviar body que o iFood já esperava (compatível com o que já funcionava sem body, agora explícito). Nova chamada de `verifyDeliveryCode` só roda em entrega própria, idempotente, falha silenciosa.
- **Migration**: só adiciona coluna nullable — zero impacto em dados existentes.

## Como você testa antes de publicar

1. Eu implemento no preview.
2. Você abre o app no preview, faz um pedido iFood entrar (homologação).
3. Avança até `delivered`.
4. Confere no painel iFood se o contador "Entregas confirmadas" sobe.
5. Só depois publica.

## Não vou mexer em

- Fluxo TAKEOUT (pickup) — já tá ok.
- Pedidos não-iFood.
- Cancelamento (`requestCancellation`) — já tá ok.
- `phantom orders`, KDS, push, WhatsApp, MP — nada disso entra no escopo.
