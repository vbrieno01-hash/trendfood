## Automatizar reprocessamento de pedidos iFood órfãos

Hoje, quando o iFood envia um evento cujo `merchantId` não bate com nenhuma loja conectada, o `ifood-webhook` salva o evento como **órfão** (`organization_id IS NULL`, `orphan_reason: "no_org_for_merchant"`). Esses pedidos só são recuperados se o usuário clicar manualmente no botão "Recuperar pedidos perdidos".

A proposta é eliminar essa intervenção manual: um job roda a cada minuto, varre os órfãos recentes e tenta processá-los automaticamente.

### O que será feito

**1. Nova edge function: `ifood-orphan-sweeper`**
- Roda sem autenticação (chamada por cron).
- Busca em `ifood_event_log` os eventos:
  - `organization_id IS NULL` (órfãos), OU
  - `internal_order_id IS NULL` com `ifood_order_id` preenchido (recebidos mas nunca virou pedido)
  - Limitado aos últimos 60 minutos (depois disso o iFood já cancela na ponta dele).
- Para cada evento órfão:
  - Pega o `merchantId` real do payload.
  - Procura uma `ifood_credentials` com esse `merchant_id`.
  - **Se achar:** chama a lógica de reprocessamento (mesma do `ifood-reprocess-orphans`) — busca o pedido na API iFood, cria localmente, insere itens/delivery, confirma no iFood, e atualiza o log com `organization_id` e `internal_order_id`.
  - **Se não achar:** marca o evento com `orphan_reason: "merchant_not_registered"` e ignora nas próximas rodadas (evita loop).
- Retorna `{ swept: N, recovered: M, skipped: K }` no JSON de resposta.

**2. Refatorar `ifood-reprocess-orphans`**
- Extrair a lógica de "buscar pedido + criar order + items + delivery + confirmar" para uma função utilitária reutilizada pelo sweeper.
- Manter o endpoint manual existente (botão na UI continua funcionando como fallback).

**3. Agendamento via pg_cron**
- Criar job rodando **a cada 1 minuto** que chama `ifood-orphan-sweeper` via `pg_net.http_post`.
- Registrar saúde em `cron_health` (padrão já usado em `release_pending_referral_bonuses` e `refresh_top_stores_showcase`).

**4. UI: simplificar `IFoodTab.tsx`**
- Remover a constante hardcoded `ORPHAN_ORDER_IDS`.
- Manter o botão "Recuperar pedidos perdidos", mas agora ele chama o **sweeper** (sem lista fixa) — vira um "forçar varredura agora" para casos de urgência.
- Mostrar contador de órfãos pendentes na seção de eventos (ex: "3 evento(s) órfão(s) aguardando varredura").

### Detalhes técnicos

```text
pg_cron (1min) ──► ifood-orphan-sweeper
                        │
                        ├─► SELECT órfãos < 60min
                        │
                        ├─► para cada: lookup credentials por merchant_id
                        │       │
                        │       ├─ achou: reprocessa via API iFood + UPDATE event_log
                        │       └─ não achou: marca "merchant_not_registered"
                        │
                        └─► UPSERT cron_health
```

- `verify_jwt = false` no `config.toml` (chamada por cron).
- Idempotente: já checa `gateway_payment_id = ifood:{orderId}` antes de criar.
- Limite de 50 órfãos por execução para não estourar timeout.

### Fora de escopo
- Não mexe no fluxo principal do polling (`ifood-poll-events`) nem no webhook.
- Não altera o gating de plano nem o cron de outros jobs.