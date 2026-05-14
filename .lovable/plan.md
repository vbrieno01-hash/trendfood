# Cancelamento iFood iniciado pelo lojista

Hoje só temos o fluxo reverso (cliente pede cancelamento via app → lojista aceita/recusa). Falta o caminho oposto: **lojista cancela direto pelo nosso painel** quando o pedido ainda está em PLC (aguardando confirmação) — sem precisar abrir o portal do iFood.

## Escopo

- Botão **"Cancelar pedido"** no chip iFood do KDS, **visível apenas em status `pending`** (PLC, antes do "Confirmar").
- Após `CFM` (confirmado/preparando/pronto/despachado), botão some — esses status só podem ser cancelados pelo portal iFood (regras do iFood, fora do escopo).
- Modal com **lista pronta de motivos** (códigos oficiais iFood pré-CFM).
- Confirmação dupla ("Tem certeza? Esta ação não pode ser desfeita").

## Motivos disponíveis (códigos iFood oficiais pré-CFM)

| Código | Label |
|---|---|
| 501 | Problemas de sistema |
| 502 | Pedido em duplicidade |
| 503 | Item indisponível |
| 504 | Sem entregador disponível |
| 505 | Cardápio desatualizado |
| 506 | Pedido fora da área de entrega |
| 508 | Restaurante fechado |
| 509 | Outros motivos |

## Fluxo técnico

```text
[Lojista clica Cancelar]
        ↓
[Modal escolhe motivo (501..509)]
        ↓
[POST ifood-cancel-order { order_id, code, reason }]
        ↓
[Edge Function chama:
   POST iFood /order/v1.0/orders/{ifood_id}/requestCancellation
   body: { reason, cancellationCode }]
        ↓
[iFood 202 → marca orders.status='cancelled',
              cancellation_reason=<label>,
              cancelled_by='merchant']
        ↓
[Webhook iFood depois confirma com CAN — idempotente, ignora se já cancelled]
```

## Arquivos

**Nova Edge Function** `supabase/functions/ifood-cancel-order/index.ts`
- Input: `{ order_id, code, reason_label }`
- Lê `gateway_payment_id` (`ifood:<id>`) e `organization_id`
- Valida status atual = `pending` (defesa em profundidade)
- Reusa `getIfoodAccessToken()` do shared (ou inline igual aos outros)
- POST para iFood `/requestCancellation` com `merchantId` e `orderId`
- Se 202: `UPDATE orders SET status='cancelled', cancellation_reason=$label`
- Loga em `ifood_event_log` (`event_type='merchant_cancel_request'`)
- `verify_jwt = false` no `config.toml` (chamada autenticada via JWT do front, validada in-code)

**`src/components/dashboard/IFoodOrderChip.tsx`**
- Adiciona prop `orderStatus`
- Quando `orderStatus === 'pending'` && `ifoodOrderType` setado: mostra botão vermelho-outline "Cancelar pedido"
- Abre `<IFoodCancelDialog>` (novo subcomponente no mesmo arquivo ou irmão)
- Dialog: Select com os 8 motivos + botão "Cancelar definitivamente"
- On confirm: `supabase.functions.invoke('ifood-cancel-order', { body: { order_id, code, reason_label } })`
- Toast de sucesso/erro, `queryClient.invalidateQueries(['orders'])`

**`src/components/dashboard/KitchenTab.tsx`**
- Passa `orderStatus={order.status}` para o `<IFoodOrderChip>`

## Regras de segurança

- Edge Function valida que `order.organization_id` pertence ao `auth.uid()` (via JWT) antes de cancelar — evita lojista A cancelar pedido de loja B.
- Idempotência: se `status` já for `cancelled`, retorna 200 sem chamar iFood.
- Erros do iFood (4xx/5xx) retornam para o front com mensagem clara, **sem** marcar como cancelado localmente.

## Fora de escopo

- Cancelamento pós-CFM (precisa de `/cancellationReasons` dinâmico + aprovação do iFood — fluxo bem mais complexo, raramente usado).
- Reembolso parcial.
- UI de "histórico de cancelamentos" (já temos no `ifood_event_log`).
