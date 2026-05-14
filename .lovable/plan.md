## Objetivo

Quando o lojista clicar no botão genérico "Cancelar pedido" (Cozinha / Garçom) em um pedido iFood, o sistema deve **avisar o iFood** automaticamente, não só marcar como cancelado no banco.

## Como funciona hoje

- **Botão antigo (`useCancelOrder`)**: só faz `UPDATE orders SET status='cancelled'` no banco + cancela impressões/entregas. O pedido some do painel do lojista, mas continua ativo no iFood.
- **Trigger `tg_orders_ifood_status_sync`**: existe e deveria chamar `ifood-update-status` ao mudar status. Mas falha silenciosamente (`EXCEPTION WHEN OTHERS RETURN NEW`), e nos pedidos 162/163 não gerou evento `OUT_REQUESTCANCELLATION`. Não é confiável como única defesa.
- **Botão novo (`ifood-cancel-order`)**: chama o iFood corretamente, mas só aparece em status `pending` (antes de confirmar).

## Mudanças

### 1. `supabase/functions/ifood-cancel-order/index.ts`

Aceitar um flag opcional `force: true` no body que permite cancelar também em `preparing` e `ready` (usado apenas pelo botão antigo). Sem o flag, segue restrito a `pending` (botão novo continua igual).

```text
- if (order.status !== "pending") → 409
+ const allowed = body.force ? ["pending","preparing","ready"] : ["pending"];
+ if (!allowed.includes(order.status)) → 409
```

### 2. `src/hooks/useOrders.ts` — `useCancelOrder`

Antes do `UPDATE` local, detectar se o pedido é iFood (`gateway_payment_id LIKE 'ifood:%'`) e chamar `ifood-cancel-order` com `force: true` e código padrão `509` (Outros motivos).

```text
1. SELECT gateway_payment_id, status FROM orders WHERE id = orderId
2. Se gateway_payment_id começa com "ifood:":
     await supabase.functions.invoke("ifood-cancel-order", {
       body: { order_id, code: "509", reason_label: reason || "Outros motivos", force: true }
     })
   - Se sucesso: a edge function já marcou como cancelled → pular UPDATE local, seguir para cancelar prints/deliveries
   - Se erro: lançar exceção (NÃO marcar como cancelado localmente, para evitar divergência com iFood)
3. Senão (pedido normal): fluxo atual inalterado.
```

### 3. Sem mudanças em UI

O botão e modal continuam idênticos. A mudança é transparente para o lojista — só fica mais confiável.

## Resultado

| Cenário | Antes | Depois |
|---|---|---|
| Cancelar pedido normal (não iFood) | OK | OK (igual) |
| Cancelar iFood em `pending` pelo botão antigo | só DB | DB + iFood (código 509) |
| Cancelar iFood em `preparing`/`ready` pelo botão antigo | só DB | DB + iFood (código 509) |
| Botão novo (modal de motivos em `pending`) | OK | OK (igual) |
| iFood retorna erro | marcava como cancelado local | **não marca**, mostra erro ao lojista |

## Arquivos alterados

- `supabase/functions/ifood-cancel-order/index.ts` (aceitar `force`)
- `src/hooks/useOrders.ts` (detectar iFood em `useCancelOrder`)
