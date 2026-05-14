# Homologação iFood — Auditoria e Plano

## Status atual

**O que já temos:**
- Tabelas: `ifood_credentials`, `ifood_event_log`, `ifood_category_map`
- Edge functions: `ifood-auth`, `ifood-poll-events`, `ifood-update-status`, `ifood-webhook`
- Polling /events:polling + acknowledgment em lote
- Refresh token automático
- Confirmação automática no PLC/CFM
- Mapeamento de status interno → endpoints iFood (startPreparation, readyToPickup, dispatch, requestCancellation)
- Notas estruturadas (cliente, telefone, CPF, endereço, frete, pagamento, troco, cupom, agendamento, obs)
- Idempotência via `gateway_payment_id = ifood:<orderId>`
- UI básica em IFoodTab.tsx (Merchant ID + status)

## Auditoria do checklist iFood (11 requisitos)

| # | Requisito | Status | O que falta |
|---|-----------|--------|-------------|
| 1 | Polling 30s + /acknowledgment | ✅ OK | pg_cron já chama poll, ack roda em lote — só validar cron a cada 30s |
| 2 | Confirmação DELIVERY/TAKEOUT no SLA | ⚠️ Parcial | Confirma só em PLC/CFM; falta tratar **PLACED** explicitamente e logar latência |
| 3 | Cancelamento + /cancellationReasons | ❌ Faltando | Hoje hardcoda `cancellationCode: "501"`. Precisa: (a) buscar `/cancellationReasons` antes, (b) UI pra lojista escolher motivo, (c) tratar evento de cancelamento solicitado pelo cliente |
| 4 | Bandeira do cartão + troco | ⚠️ Parcial | Troco OK; **bandeira do cartão** (`pay.card.brand`) não é extraída |
| 5 | Cupom (valor + responsabilidade iFood/Loja) | ⚠️ Parcial | Extrai valor mas não diferencia `sponsorshipValues[].name` (IFOOD vs MERCHANT) |
| 6 | CPF/CNPJ + código de coleta | ⚠️ Parcial | CPF OK; falta `code` de coleta (PICKUP code) e CNPJ separado |
| 7 | Observações de itens (`item.observations`) | ✅ OK | Já incluído em `buildItemName` |
| 8 | Detectar e descartar duplicatas | ⚠️ Parcial | Idempotência por orderId OK, mas **não dedupe por event.id** — mesmo evento pode entrar 2x via webhook + polling |
| 9 | Sincronizar status quando outro app altera | ❌ Faltando | Não tratamos eventos `CFM` (confirmado fora), `RPR` (em preparo), `RTP` (pronto), `DSP` (despachado), `CON` (concluído) vindos de fora |
| 10 | Plataforma de Negociação | ❌ Faltando | Não tratamos eventos `HANDSHAKE_*` / negociação |
| 11 | Webhook responder /acknowledgment | ⚠️ Parcial | Webhook responde 202 mas **não chama /acknowledgment** dos eventos recebidos |

## Plano de implementação

### Fase 1 — Robustez (gaps críticos para passar)

**1.1 Deduplicação por event.id**
- Adicionar UNIQUE constraint em `ifood_event_log(ifood_event_id)` (allow null)
- Em `ifood-poll-events` e `ifood-webhook`: tentar INSERT com `onConflict('ifood_event_id').ignoreDuplicates()`. Se já existe, pular processamento.

**1.2 Webhook envia acknowledgment**
- Em `ifood-webhook`, depois de processar cada evento com `event.id`, fazer POST em `/events/v1.0/events/acknowledgment` igual o polling faz.

**1.3 Sincronizar status externos (req #9)**
- Em `ifood-poll-events` e `ifood-webhook`, tratar codes adicionais: `CFM`, `RPR`, `RTP`, `DSP`, `CON`, `CAN` — atualizar `orders.status` correspondente quando vierem de fora (e marcar `notes` com `IFOOD_SYNC:1` pra evitar loop com `ifood-update-status`).
- Em `ifood-update-status`: antes de mandar pro iFood, checar se origem é sync externo (skip).

**1.4 Cancelamento com motivos reais**
- Nova edge function `ifood-cancellation-reasons` (GET): chama `/order/v1.0/orders/{orderId}/cancellationReasons` e retorna lista.
- Em `ifood-update-status` quando `new_status='cancelled'`: aceitar `cancellation_reason_code` e `cancellation_reason_description` no body.
- UI: ao cancelar pedido iFood na aba Vendas/Produção, abrir modal com lista de motivos puxada da edge function.

**1.5 Confirmação rastreável (req #2)**
- Em `processNewOrder` / `handleNewOrder`: capturar `Date.now()` antes do `/confirm`, calcular latência, gravar em `ifood_event_log.payload.confirm_latency_ms`.
- Tratar `PLACED` igual a `PLC`/`CFM`.

### Fase 2 — Enriquecimento de dados (req #4, #5, #6)

**2.1 Bandeira do cartão**
- Em `buildOrderNotes`: adicionar `BANDEIRA:${pay.card?.brand}` quando method = CREDIT/DEBIT.

**2.2 Cupom diferenciado**
- Mudar parser de benefits pra mostrar `IFOOD:R$X | LOJA:R$Y` baseado em `sponsorshipValues[].name`.

**2.3 Código de coleta + CNPJ**
- Adicionar `COLETA:${ifoodOrder.delivery?.pickupCode || ifoodOrder.takeout?.takeoutDateTime}` 
- Adicionar `CNPJ:${cust.taxPayerIdentificationNumber}` separado de CPF (decisão por tamanho/14 dígitos).

### Fase 3 — Plataforma de Negociação (req #10)

- Em `ifood-webhook` e `ifood-poll-events`: tratar codes `HANDSHAKE_DISPUTE`, `HANDSHAKE_SETTLEMENT`. Por ora apenas logar em `ifood_event_log` e notificar lojista via Telegram (sem ação automática). iFood aceita "exibir e notificar" como cumprimento mínimo.

### Fase 4 — UI Homologação (IFoodTab)

Adicionar painel "Status de Homologação" mostrando checklist com ✅/❌ baseado em flags reais:
- Polling ativo (last_polled_at < 60s)
- Webhook recebendo (last_event_at)
- Total eventos processados (count em ifood_event_log)
- Botão "Abrir ticket de homologação" → link `https://developer.ifood.com.br` + texto pré-pronto pra colar

### Fase 5 — Documentação pro ticket

Gerar arquivo `docs/IFOOD-HOMOLOGACAO.md` com:
- Endpoints implementados
- Tratamento de cada code
- Política de dedup
- Política de retry/refresh token
- Exemplos de payloads recebidos/enviados

## Detalhes técnicos (referência)

### Migration nova necessária

```sql
-- 1. Dedup por event.id
CREATE UNIQUE INDEX IF NOT EXISTS ifood_event_log_event_id_uniq 
  ON public.ifood_event_log(ifood_event_id) 
  WHERE ifood_event_id IS NOT NULL;

-- 2. Coluna pra rastrear sync externa (evita loop)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS ifood_synced_externally boolean DEFAULT false;
```

### Codes iFood relevantes
- `PLC` / `PLACED` — pedido novo
- `CFM` / `CONFIRMED` — confirmado
- `RPR` — em preparo
- `RTP` — pronto pra retirada
- `DSP` / `DISPATCHED` — despachado
- `CON` / `CONCLUDED` — entregue
- `CAN` / `CANCELLED` — cancelado
- `KEEPALIVE` — heartbeat (só ack, sem ação)
- `HANDSHAKE_*` — negociação

### Arquivos a alterar
- `supabase/functions/ifood-webhook/index.ts` (dedup + ack + sync codes)
- `supabase/functions/ifood-poll-events/index.ts` (dedup + sync codes + extras notes)
- `supabase/functions/ifood-update-status/index.ts` (motivos reais + skip se sync externo)
- `supabase/functions/ifood-cancellation-reasons/index.ts` (NOVA)
- `src/components/dashboard/IFoodTab.tsx` (painel homologação + modal motivos)
- `src/components/dashboard/sales/SalesItem.tsx` (botão cancelar com modal motivos pra pedidos iFood)
- Nova migration

## Ordem de execução sugerida

1. Migration (dedup + ifood_synced_externally)
2. Fase 1 inteira (4 PRs lógicos no mesmo commit)
3. Fase 2 (notas enriquecidas)
4. Fase 3 (negociação)
5. Fase 4 (UI homologação)
6. Fase 5 (docs)
7. Você abre ticket no portal iFood com link pra docs

Estimativa: ~6-8 alterações de código, 1 migration. Tudo backend + UI mínima.
