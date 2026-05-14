## Problema

A última implementação adicionou uma chamada outbound para `POST /order/v1.0/orders/{id}/concluded` quando um pedido DELIVERY/TAKEOUT vai para "Entregue". Esse endpoint não existe na iFood Order API v1.0 — o gateway do iFood retorna 404 "no Route matched". Confirmado nos pedidos 156 e 157 (logs em `ifood_event_log` → código `OUT_CONCLUDED_FAILED`).

Na prática:
- DELIVERY: o último estado que o merchant envia é `dispatch`. O iFood marca como "concluded" sozinho quando o entregador/cliente confirma.
- TAKEOUT: o último estado que o merchant envia é `readyToPickup`. O iFood marca como "concluded" quando o cliente retira.

## Correção

### 1. `supabase/functions/ifood-update-status/index.ts`

Reescrever o mapa `endpointForStatus`:

- `preparing` → `[startPreparation]`
- `ready` → `[readyToPickup]`
- `delivered` + DELIVERY → `[dispatch]` (com `skipIfFieldSet: ifood_dispatched_at`)
- `delivered` + TAKEOUT → `[]` (nada a enviar — o cliente retira do lado do iFood)
- `cancelled` → `[requestCancellation]` (mantém)

Remover toda referência ao path `concluded` e à lógica de `markField: ifood_concluded_at` no fluxo outbound.

A coluna `ifood_concluded_at` continua sendo populada **apenas pelo webhook inbound** quando chega o evento `CON` do iFood — isso permanece útil para mostrar "Entregue no iFood" na UI após confirmação real.

### 2. `supabase/functions/ifood-orphan-sweeper/index.ts`

Remover qualquer retry de `OUT_CONCLUDED_FAILED` (não faz sentido reprocessar). Limpar registros antigos pendentes.

### 3. UI (`KitchenTab.tsx` / `IFoodOrderChip.tsx`)

Manter os badges como estão:
- "Saiu para entrega" quando `ifood_dispatched_at` setado
- "Entregue no iFood" quando `ifood_concluded_at` setado (vem só do webhook agora)

Nenhuma mudança visual.

### 4. Migração de limpeza (opcional)

Marcar os `OUT_CONCLUDED_FAILED` antigos como não-pendentes para o sweeper ignorar:

```sql
-- nada a fazer no schema; só documentação
-- registros antigos de OUT_CONCLUDED_FAILED podem permanecer no log para auditoria
```

## Fora de escopo

- Endpoint correto para TAKEOUT marcado como "entregue" no painel do lojista (se o iFood exigir algo, descobrir depois consultando docs reais).
- Polling de cancelamento iniciado pelo cliente.
- Health dashboard do iFood.

## Resultado esperado

Próximo pedido DELIVERY movido para "Entregue" envia só `dispatch` e termina com sucesso. Sem mais 404 no log. Pedido TAKEOUT movido para "Entregue" não envia nada outbound (a UI continua refletindo "Entregue").
