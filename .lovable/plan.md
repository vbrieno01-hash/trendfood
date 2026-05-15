# Corrigir duplicação de pedidos do iFood

## Diagnóstico (confirmado no banco)

Consultando `orders` dos últimos 7 dias, encontrei várias entradas com o mesmo `gateway_payment_id` (formato `ifood:<uuid>`):

- `ifood:5f7d347d-...` — **4 cópias**, criadas em 14s
- `ifood:ce6becd8-...` — **4 cópias**, criadas em 1m38s
- `ifood:a8021a3e-...` e `ifood:db55a6ee-...` — **2 cópias**, criadas com ~100ms de diferença

## Causa raiz

Tanto `ifood-webhook` quanto `ifood-poll-events` recebem o mesmo evento `PLACED` do iFood. Os dois fazem o padrão **SELECT-então-INSERT** para deduplicar (`ifood-webhook/index.ts:151-177` e `ifood-poll-events/index.ts:206-228`):

```text
SELECT id FROM orders WHERE gateway_payment_id = 'ifood:<uuid>'
  → não encontra
INSERT INTO orders (...)
```

Sem **unique constraint** no banco, quando os dois processos rodam quase simultaneamente (webhook + poller, ou retries do iFood), ambos passam pelo SELECT vazio e inserem em paralelo. Resultado: duplicatas com diferença de milissegundos. Os duplicados de minutos depois vêm de re-tentativas do mesmo evento sem dedup.

## Plano

### 1. Migration SQL — barreira no banco

- Limpar duplicatas existentes mantendo o pedido mais antigo por `(organization_id, gateway_payment_id)` quando `gateway_payment_id LIKE 'ifood:%'`. Antes de deletar duplicatas: mover `order_items`, `deliveries`, `fila_impressao` referentes às cópias para o pedido canônico (ou simplesmente deletar em cascata as cópias que não têm side-effects, dado que todas as duplicatas observadas estão em status `cancelled` ou `delivered` e os items vão estar duplicados também).
- Criar **unique index parcial**:
  ```sql
  CREATE UNIQUE INDEX orders_ifood_unique
    ON orders (organization_id, gateway_payment_id)
    WHERE gateway_payment_id LIKE 'ifood:%';
  ```

### 2. Edge functions — usar upsert / tratar conflito

Em `ifood-webhook/index.ts` e `ifood-poll-events/index.ts`, trocar o INSERT por:

```ts
.insert({...}, { onConflict: 'organization_id,gateway_payment_id' })
.select('id').single()
```

ou capturar erro `23505` (unique violation) e re-buscar o `orders.id` existente, retornando-o normalmente para que o resto do fluxo (items, delivery, print) faça idempotência baseada no mesmo `internalOrderId`.

Também adicionar guarda em `order_items`/`deliveries`/`fila_impressao` para não duplicar quando o pedido já existia: só inserir esses filhos se a linha de `orders` foi de fato criada agora (não no caminho de conflito).

### 3. Validação

- Re-rodar a query de duplicados após a migration → deve voltar vazia.
- Disparar evento `PLACED` de teste duas vezes em sequência rápida via `ifood-webhook` para confirmar que a segunda não cria nova `orders`.

## Detalhes técnicos

**Arquivos a editar:**
- nova migration em `supabase/migrations/`
- `supabase/functions/ifood-webhook/index.ts` (linhas ~151-190)
- `supabase/functions/ifood-poll-events/index.ts` (linhas ~206-240)

**Tabela impactada:** `orders` (+ limpeza em `order_items`, `deliveries`, `fila_impressao` referenciando ids removidos).

**Risco:** baixo. O unique index é parcial (só afeta linhas iFood), não interfere em pedidos do cardápio digital ou balcão.
