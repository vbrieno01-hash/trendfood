## Objetivo

Garantir que toda transição de status de pedido iFood seja sincronizada nos dois sentidos (Cozinha ↔ iFood), cobrindo `confirm` → `startPreparation` → `readyToPickup` → `dispatch` → `concluded` + `cancellation`.

## Diagnóstico do que já existe

- ✅ `confirm` é chamado quando o pedido entra (em `ifood-webhook.handleNewOrder`).
- ✅ Trigger `trg_orders_ifood_status_sync` em `orders` dispara `ifood-update-status` em toda mudança de status.
- ✅ `ifood-update-status` mapeia: `preparing → startPreparation`, `ready → readyToPickup`, `delivered → dispatch`, `cancelled → requestCancellation`.
- ✅ Loop-guard via `ifood_synced_externally` já implementado.
- ✅ Webhook entrante mapeia `CFM/RPR/RTP/DSP/CON/CAN`.

## Lacunas a corrigir

1. **`concluded` nunca é enviado.** Hoje `delivered` envia só `dispatch`. iFood espera `dispatch` (saiu) e depois `concluded` (entregue) — sem `concluded` o pedido fica "Em rota" eterno no app do cliente.
2. **TAKEOUT não tem `dispatch`.** Pedido de retirada vai direto de `readyToPickup` → `concluded`. Hoje enviaríamos `dispatch` errado.
3. **Sem rastreio de qual transição já foi enviada.** Risco de chamar `dispatch` 2x e tomar erro do iFood.
4. **Inbound colapsa DSP e CON em `delivered`**, perdendo a diferença "saiu" vs "entregue". Cozinha não vê distinção.
5. **Sem retry quando o iFood retorna 5xx/timeout**, transição fica perdida.

## Mudanças propostas

### 1. Schema (migração)

Adicionar em `orders`:
- `ifood_order_type text` — `DELIVERY` | `TAKEOUT` (preenchido no webhook ao criar)
- `ifood_dispatched_at timestamptz`
- `ifood_concluded_at timestamptz`

Esses campos servem como idempotência por transição e para o painel de saúde.

### 2. `ifood-webhook` (inbound)

- Salvar `ifood_order_type` ao criar o pedido.
- Em `syncExternalStatus`:
  - Quando recebe `DSP/DISPATCHED`: marca `ifood_dispatched_at = now()`, status interno continua `ready` (não pula direto para delivered, pra Cozinha ver "Saiu para entrega").
  - Quando recebe `CON/CONCLUDED`: marca `ifood_concluded_at = now()`, status interno → `delivered`.

Alternativa simples (decisão pendente — pergunto abaixo): manter ambos virando `delivered` e usar só os timestamps para diferenciar visualmente.

### 3. `ifood-update-status` (outbound)

Refatorar `endpointForStatus` para suportar fluxo composto baseado em `ifood_order_type` e nos timestamps:

```text
internal status → ações iFood
─────────────────────────────────────────────────
preparing       → startPreparation (se não chamado)
ready           → readyToPickup
delivered + DELIVERY:
                  → dispatch  (se ifood_dispatched_at IS NULL)
                  → concluded (se ifood_concluded_at IS NULL)
delivered + TAKEOUT:
                  → concluded (sem dispatch)
cancelled       → requestCancellation
```

A função busca `orders` para ler `ifood_order_type` + timestamps, executa as chamadas em sequência, atualiza os timestamps e loga cada uma em `ifood_event_log` com `code = OUT_<ACTION>`.

### 4. Retry de transições falhas

- Se a chamada outbound retornar status ≥ 500 ou erro de rede, gravar evento em `ifood_event_log` com `code = OUT_<ACTION>_FAILED` e `payload.retry_pending = true`.
- Adicionar varredura ao `ifood-orphan-sweeper` existente: a cada minuto, pega eventos `OUT_*_FAILED` com `retry_pending = true` dos últimos 30min e re-chama. Marca como `retry_pending = false` após sucesso.

### 5. UI da Cozinha (mínima)

Em `KitchenTab.tsx` / `WaiterTab.tsx`, badge para pedidos iFood mostrando:
- "Confirmado" / "Preparando" / "Pronto" / "Saiu p/ entrega" (quando `ifood_dispatched_at` definido) / "Entregue".

Sem novos status internos — apenas leitura dos timestamps.

## Fora de escopo

- Polling de cancelamento iniciado pelo cliente no app iFood (já capturado parcialmente pelo webhook `CAN`).
- Sincronização de catálogo/pausa de loja com iFood.
- Health dashboard completo do iFood na aba.

## Pergunta antes de implementar

Sobre o item 2 do inbound, você prefere:

**(a)** Manter status interno simples (`DSP` e `CON` ambos viram `delivered`) e diferenciar só via timestamps + badge na Cozinha.

**(b)** Adicionar um estado intermediário `ready` enquanto está com entregador (mais limpo conceitualmente, mas duplica o significado de `ready` que hoje significa "pronto para retirar/sair").

Recomendo **(a)** — é menos invasivo e cobre o caso de uso visual.