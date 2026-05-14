# Finalizar integração iFood — 3 frentes restantes

Fluxo principal (CFM → STP → RTP → DSP) já validado em produção (pedidos 158/159 sem erros). Restam 3 lacunas para considerar a integração "production-ready".

## 1. Cancelamento iniciado pelo cliente / iFood

Hoje só tratamos cancelamento outbound (lojista). Quando o **cliente cancela no app** ou o **iFood cancela** (CAN/CCAN), precisamos refletir isso na Cozinha.

**O que fazer (`supabase/functions/ifood-webhook/index.ts`):**
- Adicionar handler para os codes:
  - `CAN` (CANCELLED) → `status='cancelled'`, gravar `cancellation_reason` do payload em `notes`.
  - `CCAN` (CONSUMER_CANCELLATION_REQUESTED) → marcar pedido com flag visual ("Cliente solicitou cancelamento") + tocar alarme no KDS, mas **não** cancelar automaticamente.
- Para `CCAN` o lojista decide: aceitar (chama `requestCancellation` outbound, já existe) ou recusar (novo endpoint `denyCancellation`).

**UI (`IFoodOrderChip.tsx` / `KitchenTab.tsx`):**
- Quando há solicitação pendente: badge laranja "Cliente quer cancelar" + 2 botões (Aceitar / Recusar).
- `cancelled` pelo iFood → card vai para histórico com motivo.

**Edge function `ifood-deny-cancellation` (nova):** POST `/order/v1.0/orders/{id}/denyCancellation` com `{reason, cancellationCode}`.

## 2. TAKEOUT marcado como "Entregue"

Hoje TAKEOUT não envia nada outbound quando o lojista marca "Entregue" — o cliente confirma a retirada no app dele. Mas alguns merchants querem **forçar** essa marcação.

**Decisão necessária (pergunto antes de codar):** manter como está (fail-open, esperar `CON` do webhook) ou tentar endpoint `/readyToPickup` repetido + aguardar `CON`? A doc oficial não expõe ação de "concluir" para o lojista em TAKEOUT — o caminho correto é não fazer nada e exibir badge "Aguardando retirada do cliente".

**Recomendação:** apenas ajustar a UI para deixar claro que TAKEOUT em estado "ready" fica esperando o `CON` do iFood (sem ação do lojista), e badge muda para "Retirado" quando `ifood_concluded_at` chega.

## 3. Dashboard de saúde iFood (`IFoodTab.tsx`)

Painel simples na aba `?tab=ifood` mostrando:
- **Status do polling** (`ifood-poll-events` última execução, success rate 24h via `ifood_event_log`).
- **Pedidos órfãos** (count de orders com `ifood_order_type` mas sem `ifood_dispatched_at` há mais de 2h).
- **Falhas outbound** (count de eventos `OUT_*_FAILED` últimas 24h).
- **Últimos 20 eventos** do `ifood_event_log` com filtro por code.
- Botão "Forçar polling agora" → invoca `ifood-poll-events`.
- Botão "Ressincronizar pedido" (dialog com `ifood_order_id`) → invoca `ifood-update-status` com retry.

Tudo client-side via `useQuery` em `ifood_event_log` + 1 RPC `get_ifood_health_metrics()` que devolve os agregados em uma única chamada.

## Arquivos tocados

```text
supabase/functions/ifood-webhook/index.ts       (CAN, CCAN handlers)
supabase/functions/ifood-deny-cancellation/     (nova)
supabase/migrations/                            (RPC get_ifood_health_metrics)
src/components/dashboard/IFoodTab.tsx           (dashboard de saúde)
src/components/dashboard/IFoodOrderChip.tsx     (badges CCAN/cancelado)
src/components/dashboard/KitchenTab.tsx         (botões aceitar/recusar cancelamento)
```

## Fora de escopo

- Reembolso parcial (iFood Refund API) — funcionalidade adicional, não bloqueia operação.
- Catálogo iFood (sync de cardápio bidirecional) — escopo separado.
- Logística própria via iFood (Driver API) — nicho.

## Pergunta antes de implementar

**Sobre o item 2 (TAKEOUT "Entregue"):** confirma que está OK deixar sem ação outbound e só mostrar "Aguardando cliente retirar"? Ou você quer um botão "Marcar como retirado" que só atualiza localmente (não envia ao iFood)?

Se "ok como está" → implemento os 3 itens em sequência.
