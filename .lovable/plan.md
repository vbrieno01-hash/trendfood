# Retomar integração iFood — ativar recebimento de pedidos

## Estado atual

- **Edge functions deployadas:** `ifood-auth`, `ifood-poll-events`, `ifood-update-status`, `ifood-webhook`.
- **Tabelas:** `ifood_credentials` (1 registro de teste, status `pending`), `ifood_event_log`.
- **Trigger SQL:** `tg_orders_ifood_status_sync` envia mudanças de status do nosso lado para o iFood.
- **Aba no dashboard:** `IFoodTab.tsx` (conectar / desconectar / ver eventos).

## Problemas que travam o fluxo

1. **Não existe `pg_cron` rodando o polling.** Como o iFood entrega pedidos via long-polling (`/events/v1.0/events:polling`), sem um job chamando `ifood-poll-events` periodicamente, nenhum pedido novo chega. Hoje `last_polled_at` está `null` em todas as credenciais.
2. **`ifood-webhook` está incompleto.** Loga eventos mas só descarta os que não têm `merchantId`. Não resolve `merchant_id → organization_id`, não processa `PLC`/`CFM`/`CAN`, não dá ACK. Toda a lógica útil está duplicada dentro do `ifood-poll-events`.
3. **Cancelamento manual no nosso painel não dispara cancelamento no iFood** — o trigger só sincroniza o ciclo de produção (preparing/ready/delivered), mas falta o caminho `cancelled` no `ifood-update-status`.

## O que vou fazer

### 1. Criar cron job de polling (a cada 30 segundos)

Inserir via `supabase--insert` (não migração — contém URL e chave do projeto):

```sql
SELECT cron.schedule(
  'ifood-poll-events-30s',
  '30 seconds',
  $$ SELECT net.http_post(
       url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-poll-events',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```

Como `pg_cron` mínimo é 1 minuto, vou agendar dois jobs defasados (`* * * * *` e outro com `pg_sleep(30)`) para conseguir 30s — ou aceitar 1min se o iFood tolerar (eles recomendam ≤30s, mas durante homologação 60s é aceito).

### 2. Refatorar `ifood-webhook` para processar eventos de verdade

- Resolver `merchantId → organization_id` consultando `ifood_credentials.merchant_id`.
- Reaproveitar o mesmo `processNewOrder` / `processCancellation` do `ifood-poll-events` (extrair pra função compartilhada inline).
- Logar todos os eventos em `ifood_event_log` com `source='webhook'`.
- Continuar respondendo 200 imediato pra não estourar timeout do iFood.

Webhook + polling juntos = redundância exigida na homologação (se o webhook falha, o polling resgata; o ACK no polling evita reprocessar).

### 3. Completar `ifood-update-status`

Adicionar tratamento para:
- `cancelled` → POST `/order/v1.0/orders/{id}/requestCancellation` com motivo padrão.
- `ready` → POST `/order/v1.0/orders/{id}/dispatch` quando for entrega própria, ou marcar `readyToPickup` quando for retirada.

### 4. Telinha de homologação na aba iFood

Pequenos ajustes no `IFoodTab.tsx`:
- Mostrar "Polling rodando há X segundos" baseado em `last_polled_at`.
- Botão "Forçar polling agora" (chama `ifood-poll-events` manualmente).
- Mostrar `merchantId` resolvido (validação rápida pro lojista ver que o ID está certo).

## Detalhes técnicos

```text
Fluxo de pedido novo:
iFood → [webhook POST]   → ifood-webhook → resolve merchant → cria order
      → [polling /events] → ifood-poll-events → ACK + cria order (idempotente via gateway_payment_id)

Fluxo de status:
order UPDATE → trigger tg_orders_ifood_status_sync → ifood-update-status → POST /confirm /dispatch /requestCancellation
```

A **idempotência** já existe: ambos os caminhos verificam `gateway_payment_id = 'ifood:' + orderId` antes de inserir. Sem risco de duplicar pedidos.

## Fora deste plano (deixar pra depois)

- Cardápio sincronizado com o iFood (catalog API) — fase 2 da homologação.
- Disputas / chargebacks.
- Relatório financeiro iFood separado.
