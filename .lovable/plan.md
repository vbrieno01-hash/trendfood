## Estado atual (auditoria)

**Já existe:**
- `IFOOD_CLIENT_ID` / `IFOOD_CLIENT_SECRET` configurados
- Tabela `ifood_credentials` (merchant_id, tokens, status)
- Edge function `ifood-auth` — troca token via OAuth
- Edge function `ifood-poll-events` — polling de eventos PLC/CFM e ack
- Edge function `ifood-webhook` — recebe push (PLC/CFM/CAN) e cria pedidos
- `IFoodTab.tsx` é apenas tela "EM BREVE" (placeholder)

**Faltando para homologação:** UI real de conexão, ciclo de vida completo de pedido, captura de campos exigidos pelo iFood (agendamento, voucher, troco, CPF, retirada, cancelamento), envio de status de volta para o iFood, e o módulo Catalog (não existe).

---

## Order — 5 cenários

### 1. UI de conexão (substitui placeholder)
Reescrever `src/components/dashboard/IFoodTab.tsx`:
- Card de status (`disconnected` / `connecting` / `connected` / `error`)
- Input para `merchant_id` (loja iFood)
- Botão "Conectar" → chama `ifood-auth` com `client_credentials`
- Botão "Reconectar" e "Desconectar"
- Lista dos últimos eventos recebidos (debug do homologador)
- Status de polling (último ack)

### 2. Ingestão completa do pedido (Cenários 1, 3, 5)
Refatorar `processNewOrder` (em `ifood-poll-events`) e `handleNewOrder` (em `ifood-webhook`) para extraírem **todos** os campos exigidos:

| Campo iFood | Onde guardar |
|---|---|
| `displayId`, `id` | `gateway_payment_id = ifood:{id}` + notes `[iFood #displayId]` |
| `orderTiming` (`IMMEDIATE`/`SCHEDULED`) + `scheduledDateTime` | notes `AGENDADO:{ISO}` (já suportado pelo memory order-scheduling) |
| `orderType` (`DELIVERY`/`TAKEOUT`/`INDOOR`) | notes `TIPO:Entrega` ou `TIPO:Retirada` |
| `customer.name`, `phone.number`, `documentNumber` (CPF/CNPJ) | notes `CLIENTE:`, `TEL:`, `CPF:` |
| `delivery.deliveryAddress.formattedAddress` + `deliveryFee` | notes `END.:`, `FRETE:R$ X,XX`, e row em `deliveries` |
| `payments.methods[].method` + `prepaid` + `cash.changeFor` | notes `PGTO:`, `TROCO:R$ X,XX` (Cenário 5) |
| `benefits[]` (vouchers, ex.: `VOUCHER_ENTGRATIS`) | notes `CUPOM:{name} -R$X,XX` (Cenário 1) |
| `extraInfo` (observação do cliente) | notes `OBS:` (Cenário 5) |
| `total.orderAmount`, `subTotal`, `additionalFees` | gravar em `total` e `subtotal` |
| `items[].observations`, `options[]` (complementos) | concatenar no `name` do `order_items` no formato existente `Item (+ Adicional R$X,XX) | Obs: ...` |

Resultado: pedido aparece na produção como qualquer outro, com agendamento, troco, CPF e voucher visíveis na tela e no cupom térmico.

### 3. Envio de status para o iFood (todos cenários)
Criar nova edge function `ifood-update-status` que recebe `{ order_id, action }` e dispara o endpoint correspondente:

| Ação | Endpoint iFood |
|---|---|
| Confirmar | `POST /order/v1.0/orders/{id}/confirm` |
| Iniciar preparo | `POST /order/v1.0/orders/{id}/startPreparation` |
| Pronto/despachar | `POST /order/v1.0/orders/{id}/dispatch` |
| Concluído | `POST /order/v1.0/orders/{id}/concluded` |
| Cancelar (Cenário 2) | `POST /order/v1.0/orders/{id}/requestCancellation` com `{ reason, cancellationCode }` |

Plugar via trigger SQL em `orders`: quando `status` muda e `gateway_payment_id LIKE 'ifood:%'`, chama via `pg_net` a edge function. Mapeamento: `pending→confirm`, `preparing→startPreparation`, `ready→dispatch` (delivery) ou `concluded` (takeout), `cancelled→requestCancellation`.

### 4. Cancelamento iniciado pela plataforma (Cenário 4)
Já existe `handleCancellation` no webhook (event `CAN`). Adicionar:
- Aceitar formalmente: `POST /order/v1.0/disputes/{disputeId}/accept` quando vier `CAN` com motivo do iFood
- Disparar push notification e Telegram para o lojista (já temos infra em `notify-merchant-telegram`)
- UI: badge vermelho "Cancelado pelo iFood" na lista de pedidos

### 5. Migração SQL (suporte aos cenários)
- Adicionar colunas em `ifood_credentials`: `last_polled_at TIMESTAMPTZ`, `last_event_log JSONB`
- Criar tabela `ifood_event_log` (event_id, code, order_id, payload, received_at) para auditoria — homologador pede orderId
- Trigger em `orders` que dispara `ifood-update-status` em mudanças de status

---

## Catalog — 3 cenários

Hoje **não há sync** com iFood. Criar do zero:

### 1. Edge function `ifood-catalog-sync`
Operações:
- `POST /catalog/v2.0/merchants/{merchantId}/categories` — criar categoria
- `POST /catalog/v2.0/merchants/{merchantId}/items` — criar item (nome, preço, status, image upload)
- `PATCH /catalog/v2.0/merchants/{merchantId}/items/{itemId}` — alterar
- `POST /catalog/v2.0/merchants/{merchantId}/optionGroups` — grupo de complementos
- `POST /catalog/v2.0/merchants/{merchantId}/options` — complemento individual

### 2. Mapeamento de IDs
Adicionar colunas:
- `menu_categories.ifood_id TEXT`
- `menu_items.ifood_id TEXT`
- `global_addons.ifood_option_id TEXT` + `ifood_group_id TEXT`

### 3. Botão "Sincronizar com iFood" no Cardápio
- Em `MenuTab`, novo botão "Sincronizar iFood" (visível só quando `ifood_credentials.status = connected`)
- Triggers automáticos via DB: ao `INSERT/UPDATE` em `menu_items` ou `menu_categories`, dispara edge function via `pg_net` (debounced)
- Upload de imagem: pega URL do bucket `menu-images` e envia para iFood

### 4. Pausar item (Cenário 3)
- Quando `menu_items.available = false`, sincroniza `status: UNAVAILABLE` no iFood
- Quando `true`, volta para `AVAILABLE`

---

## Estrutura técnica resumida

```text
Frontend
├── IFoodTab.tsx (reescrito) — conectar, status, log de eventos
└── MenuTab.tsx — botão "Sincronizar iFood"

Edge Functions
├── ifood-auth                  (existe — refinar)
├── ifood-webhook               (existe — expandir parsing)
├── ifood-poll-events           (existe — expandir parsing)
├── ifood-update-status         (NOVO — manda status pro iFood)
└── ifood-catalog-sync          (NOVO — CRUD de cardápio)

DB
├── ifood_credentials (+ colunas: last_polled_at, last_event_log)
├── ifood_event_log (NOVA — auditoria)
├── menu_items.ifood_id (NOVO)
├── menu_categories.ifood_id (NOVO)
├── global_addons.ifood_option_id, ifood_group_id (NOVOS)
└── trigger orders → pg_net → ifood-update-status
```

---

## Ordem de implementação sugerida

1. **Migration SQL** (colunas + tabela log + trigger placeholder)
2. **Reescrever `IFoodTab`** com fluxo de conexão real e tela de eventos
3. **Expandir `ifood-webhook` e `ifood-poll-events`** para extrair todos os campos (cobre cenários 1, 3, 5)
4. **Criar `ifood-update-status`** + ativar trigger (cobre cenários 2, 4 e fluxo completo)
5. **Catalog: migration de IDs + edge function `ifood-catalog-sync` + botão na MenuTab** (cobre os 3 de Catalog)
6. **Tela admin de logs** em `IFoodTab` mostrando os 5 últimos `orderId` para colar no chamado do iFood

Cada etapa testável isoladamente. Após cada uma, te aviso o que validar antes de seguir.

---

## Pendências que preciso confirmar antes de começar

- **merchantId de homologação**: qual é? (precisa estar cadastrado em `ifood_credentials.merchant_id` da loja de teste antes do passo 2)
- **Ambiente sandbox ou produção?**: a URL `merchant-api.ifood.com.br` é a mesma; o iFood diferencia pelo client_id. Confirma se o `IFOOD_CLIENT_ID` atual é de homologação.
- **Loja de teste**: qual organization_id vamos usar (ou crio uma loja "Homologação iFood" nova?)
