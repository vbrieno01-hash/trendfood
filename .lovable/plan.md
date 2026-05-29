## Problema

Os valores dos pedidos iFood estão chegando inflados. Causa raiz confirmada no banco:

- Pedido `#6413` (qty=4) → `price = 231,60` (= 57,90 × 4)
- Pedido `#3364` (qty=2) → `price = 115,80` (= 57,90 × 2)
- Pedido qty=1 → `price = 57,90` ✓

Ou seja: estamos salvando o **total da linha** (`item.totalPrice`) no campo `price` da tabela `order_items`, mas a convenção do sistema é que `price` é o **preço unitário** — a quantidade é multiplicada depois no frontend/recibos. Resultado: pedidos com qty > 1 ficam multiplicados duas vezes (qty²).

Isso afeta:
- Exibição na Produção/Vendas
- Recibos térmicos
- Relatórios financeiros
- Telegram / WhatsApp de notificação

Tudo só para pedidos iFood (`gateway_payment_id LIKE 'ifood:%'`). Pedidos WhatsApp, balcão, mesa, PIX e MP não são afetados.

## Causa exata

Em 4 lugares (2 arquivos), o insert/patch do item faz:
```ts
price: Number(it.totalPrice ?? it.unitPrice ?? 0)
```
`totalPrice` no payload do iFood = `unitPrice × quantity`. Deveria priorizar `unitPrice`.

Mesmo problema nos adicionais (`buildItemName`):
```ts
const price = (o.totalPrice ?? o.price ?? o.unitPrice ?? 0);
```
Faz o label do adicional mostrar o valor total da linha do adicional em vez do unitário.

## Correção proposta

**Itens (4 ocorrências):**
```ts
const qty = Number(it.quantity ?? 1) || 1;
const unit = it.unitPrice != null
  ? Number(it.unitPrice)
  : Number(it.totalPrice ?? 0) / qty;
// ...
price: unit,
```

**Adicionais (label):** mesma lógica — priorizar `unitPrice`, dividir `totalPrice` por `quantity` se só vier o total.

**Arquivos alterados:**
- `supabase/functions/ifood-webhook/index.ts` (linhas 158, 203, 315)
- `supabase/functions/ifood-poll-events/index.ts` (linhas 169, 216, 366)

**Backfill (opcional, só recomendado se você quiser corrigir os pedidos de teste já registrados):** UPDATE em `order_items` dos pedidos iFood com qty > 1 dividindo `price` por `quantity`. Como são só pedidos de homologação/teste, dá pra **pular** o backfill e deixar valer só pra pedidos novos.

## Risco

- Mexe **só** em edges iFood, só na hora de inserir item novo.
- Não toca em pedidos existentes (sem backfill).
- Não afeta WhatsApp, balcão, mesa, KDS, MP, PIX, recibos não-iFood.
- Não muda lógica de status, dispatch, verifyDeliveryCode (já implementados).

## Validação

Após deploy, próximo pedido iFood de teste com qty>1 deve mostrar o valor unitário correto em `order_items.price`, e o total na UI/recibo deve bater com o `total` do iFood.
