## Objetivo

Cobrir 100% do checklist oficial do iFood Order Module para passar na homologação. Foco nos 6 gaps identificados.

## Escopo dos gaps

| # | Item iFood | Estado hoje | Ação |
|---|---|---|---|
| 1 | `ORDER_PATCHED` (modificação pós-confirmação) | Não tratado | Implementar handler completo |
| 2 | Plataforma de Negociação (`/accept` / `/reject` / `/alternative`) | Só logado | Implementar resposta real |
| 3 | `/validatePickupCode` (coleta) | Ausente | Implementar |
| 4 | `/verifyDeliveryCode` (entrega própria) | Ausente | Implementar |
| 5 | `/tracking` + `ASSIGN_DRIVER` (entrega iFood) | Ausente | Implementar |
| 6 | `orderTiming = SCHEDULED` | Detectado, mas sem comportamento | Suprimir alarme imediato, exibir horário agendado, ordenar pela hora prevista |

---

## 1. ORDER_PATCHED — modificações de pedido

### Backend
- No `ifood-poll-events` e `ifood-webhook`, tratar `event.code === "ORDER_PATCHED"`:
  - `changeType === "DELETE_ITEMS"` → remover linhas correspondentes de `order_items` (match por `external_id` / nome+quantidade), recalcular `total` em `orders`.
  - `changeType === "ADD_ITEMS"` → inserir novas linhas em `order_items` e recalcular total.
  - `changeType === "PRICE_CHANGED"` / `BENEFITS_CHANGED` → atualizar `total` e cupom no notes.
  - Marcar `orders.ifood_synced_externally = true` (mesma flag anti-loop já usada).
- Após persistir, reinserir `fila_impressao` com uma comanda "ATUALIZAÇÃO DE PEDIDO" listando o que mudou.
- ACK obrigatório do evento.

### Tabela
- Adicionar coluna `orders.ifood_patched_at timestamptz` para mostrar selo "Pedido alterado" no KDS.

### Frontend (KDS / OperationsTab)
- Mostrar badge laranja "ALTERADO" quando `ifood_patched_at > created_at`.
- Realtime já reativo (staleTime 0 no KDS).

---

## 2. Plataforma de Negociação (Handshake)

### Nova Edge Function `ifood-handshake-respond`
Aceita `{ disputeId, organization_id, action: "accept" | "reject" | "alternative", reason?, detailReason?, alternativeAmount?, additionalTime? }`.
Chama `POST /order/v1.0/disputes/{disputeId}/accept|reject|alternative`.

### Nova tabela `ifood_disputes`
- `id`, `organization_id`, `dispute_id` (UNIQUE), `order_id` (interno), `ifood_order_id`, `dispute_type`, `expires_at`, `payload jsonb`, `status` ('open'|'accepted'|'rejected'|'alternative_offered'|'expired'|'auto_resolved'), `responded_at`, `response_payload`, `created_at`.
- RLS: dono da org via `organizations.user_id` + admin via `has_role`.

### Polling/webhook
- Quando chega `HANDSHAKE_*` ou evento de dispute, inserir/atualizar `ifood_disputes` com `expires_at` real do payload.
- Disparar Telegram para o lojista (já existe) + push.

### UI no Dashboard (nova sub-aba "Negociações" dentro de IFoodTab ou alerta vermelho no KDS)
- Lista de disputes abertas com countdown até `expires_at`.
- Botões: Aceitar / Recusar / Oferecer alternativa (modal com valor parcial ou tempo adicional).
- Após resposta, refletir status e desabilitar botões.

### Worker de expiração
- pg_cron a cada 5 min: marcar `status='expired'` quem passou de `expires_at` sem resposta.

---

## 3. `/validatePickupCode`

### Nova Edge Function `ifood-validate-pickup-code`
- Body: `{ organization_id, ifood_order_id, code }`.
- `POST /order/v1.0/orders/{id}/validatePickupCode`.
- Retorna `{ valid: boolean }`.

### UI
- No card do pedido iFood com `pickupCode` definido no payload, botão "Validar código do entregador" → modal com input numérico → chama a edge → mostra ✅/❌.

---

## 4. `/verifyDeliveryCode` (entrega própria)

### Nova Edge Function `ifood-verify-delivery-code`
- Body: `{ organization_id, ifood_order_id, code }`.
- `POST /orders/{id}/verifyDeliveryCode`.

### UI (na tela do Entregador / `CourierPage`)
- Quando entrega é de origem iFood (campo a propagar via `deliveries.metadata.ifood_order_id`), exibir input "Código do cliente" no ato da entrega; ao validar, marca como entregue.

---

## 5. `/tracking` + `ASSIGN_DRIVER`

### Polling/webhook
- Tratar `event.code === "ASSIGN_DRIVER"`: salvar `orders.ifood_driver_assigned_at` + `orders.ifood_driver_name` (novas colunas).

### Nova Edge Function `ifood-tracking`
- `GET /orders/{id}/tracking` proxy, retorna lat/lng/eta.
- Respeitar 30 s entre chamadas: cachear em memória por org+order.

### UI no KDS
- Quando há `ifood_driver_assigned_at` em pedido `out_for_delivery`, mostrar chip "Entregador iFood a caminho — ETA Xmin" puxando da função (refresh a cada 30 s, só enquanto card aberto).

---

## 6. `orderTiming = SCHEDULED`

### Backend
- Já capturamos `SCHEDULED` no payload. Persistir em `orders.scheduled_for timestamptz` (extrair de `schedule.deliveryDateTimeStart`).
- Não disparar alarme contínuo quando `scheduled_for` está a > 60 min do prepare time (já temos `prepare_time_minutes` por org).

### Frontend
- KDS: pedidos agendados ficam numa faixa separada "Agendados" até entrar na janela de preparo.
- Mostrar "Agendado para DD/MM HH:mm" no card.

---

## 7. Painel de homologação

Atualizar `IFoodHomologacaoTab.tsx`:
- Adicionar 6 novos itens no `CHECKLIST` (todos `ok` após implementação).
- Atualizar item "Plataforma de Negociação" de `partial` → `ok`.
- Adicionar seção "Como testar para o analista iFood" com passos clicáveis (simular patch, simular dispute, validar pickup code, etc.).

---

## 8. Documentação

Atualizar `docs/IFOOD-HOMOLOGACAO.md`:
- Tabela de mapeamento de status: adicionar `ORDER_PATCHED`, `ASSIGN_DRIVER`, `HANDSHAKE_*` respondidos.
- Nova seção "Plataforma de Negociação" com endpoints e fluxo.
- Nova seção "Validação de códigos" (pickup + delivery).
- Nova seção "Rastreamento iFood".
- Nova seção "Pedidos agendados".

Regerar `public/docs/ifood-homologacao-trendfood.pdf` (manual após merge).

---

## Migrações SQL (uma única migration)

```text
ALTER TABLE orders
  ADD COLUMN ifood_patched_at timestamptz,
  ADD COLUMN ifood_driver_assigned_at timestamptz,
  ADD COLUMN ifood_driver_name text,
  ADD COLUMN scheduled_for timestamptz;

CREATE TABLE ifood_disputes (...);  -- conforme item 2
ALTER TABLE ifood_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ... (owner + admin select/update; service insert);

-- pg_cron: expirar disputes
SELECT cron.schedule('ifood-disputes-expire', '*/5 * * * *', $$
  UPDATE ifood_disputes SET status='expired'
  WHERE status='open' AND expires_at < now();
$$);
```

---

## Edge functions novas

```text
supabase/functions/
├── ifood-handshake-respond/
├── ifood-validate-pickup-code/
├── ifood-verify-delivery-code/
└── ifood-tracking/
```

E modificações em:
- `ifood-poll-events/index.ts` (ORDER_PATCHED, ASSIGN_DRIVER, dispute capture, SCHEDULED persist)
- `ifood-webhook/index.ts` (mesmas)

---

## Ordem de execução

1. Migration (colunas + tabela disputes + cron)
2. Atualizar poll-events + webhook (PATCHED, ASSIGN_DRIVER, SCHEDULED, dispute capture)
3. Criar as 4 edge functions novas
4. UI no KDS: badge alterado, agendados, chip de entregador, modal pickup code
5. UI Negociações no dashboard
6. UI código de entrega no CourierPage
7. Atualizar IFoodHomologacaoTab + docs
8. Smoke test com `curl_edge_functions` por endpoint

---

## Risco principal

- Sem ambiente sandbox do iFood disponível para QA cego, parte da validação depende do próprio analista no vídeo. Por isso, **toda ação tem botão dedicado e visível no painel** — o analista grava clicando.
- `ORDER_PATCHED` matching: se o payload não trouxer `external_id`, usar fallback por (nome + quantidade) e logar warning em `ifood_event_log.payload`.
