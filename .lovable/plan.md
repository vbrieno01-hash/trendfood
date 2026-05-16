# Homologação iFood — Merchant API

## Contexto

Já temos a **Order API v3** funcionando (recebe pedidos, confirma, cancela). Agora o iFood quer também a **Merchant API**, que é uma integração **separada** que serve pra **gerenciar a loja em si** dentro do iFood: status (aberto/fechado), horários de funcionamento e pausas/interrupções.

Como o TrendFood já é o "sistema-mãe" do lojista, faz sentido a gente **espelhar** para o iFood o que o lojista configura aqui. Ex: quando ele pausa a loja no TrendFood, a gente também pausa no iFood automaticamente.

## O que vamos construir

### 1. Edge Function `ifood-merchant-api`
Função única que abstrai todos os 8 endpoints da Merchant API:

```text
GET    /merchants                              → lista lojas vinculadas ao token
GET    /merchants/{id}                         → dados completos + endereço
GET    /merchants/{id}/status                  → state (OK/WARNING/CLOSED/ERROR)
GET    /merchants/{id}/interruptions           → pausas ativas
POST   /merchants/{id}/interruptions           → cria pausa
DELETE /merchants/{id}/interruptions/{intId}   → remove pausa
GET    /merchants/{id}/opening-hours           → horários (turnos)
PUT    /merchants/{id}/opening-hours           → atualiza horários
```

A função aceita `{ action, merchantId, payload }` e roteia internamente. Reaproveita `ifood-auth` para o token Bearer e trata retry/backoff para erros 5xx, respeitando `Retry-After` em 429.

### 2. Sync automático TrendFood → iFood

Triggers SQL + edge function que mantêm a loja iFood em paridade:

- Quando lojista **pausa loja** no TrendFood (`organizations.paused = true`) → cria interruption no iFood
- Quando **despausa** → deleta a interruption
- Quando **muda horários** (`business_hours` JSONB) → PUT em `/opening-hours` no iFood
- Quando **fecha manualmente fora do horário** → respeita o status calculado pelo iFood

Implementado via novo trigger `tg_orgs_sync_ifood_merchant` que chama a edge function por `pg_net` sempre que `paused` ou `business_hours` mudarem.

### 3. Nova aba "Merchant iFood" no admin (homologação)

Tab adicionada ao painel `IFoodHomologacaoTab` com:

- **Lista de merchants** (dropdown com lojas do token)
- **Card de status atual** (state + available + opening-hours)
- **Lista de interrupções** com botão "Criar pausa de 30min" / "Remover"
- **Editor de horários** (visualização dos turnos do iFood)
- **Botão "Rodar checklist de homologação"** que executa as 8 chamadas em sequência e mostra ✅/❌ para cada uma com o critério de aprovação

Esse painel é o que você vai gravar pro vídeo de homologação Merchant.

### 4. Documento atualizado de homologação

Adicionar seção 12 ao `docs/IFOOD-HOMOLOGACAO.md` cobrindo a Merchant API: arquitetura, endpoints, mapeamento de status, tratamento de erros (400/401/403/409/429/500), rate limit de 1000 req/s e polling mínimo de 30s para status.

## Detalhes técnicos

### Tabelas novas
```text
ifood_merchant_link
├── organization_id (FK, unique)
├── ifood_merchant_id (text, unique no escopo do client)
├── last_synced_at
├── last_status (jsonb)
└── last_sync_error (text)

ifood_merchant_interruptions
├── ifood_merchant_id
├── interruption_id (id retornado pelo iFood)
├── trendfood_reason (paused_manual | break_hours | …)
├── start, end
└── created_at
```

### Tratamento de erros padronizado
A edge function devolve sempre `{ code, message, details? }` mapeando:
- 400 → `BadRequest`
- 401 → `Unauthorized` (dispara refresh do token via `ifood-auth`)
- 403 → `Forbidden`
- 409 → código específico devolvido pelo iFood (ex: `InterruptionOverlap`)
- 429 → respeita `Retry-After` e reenfileira
- 5xx → retry com backoff exponencial (3 tentativas)

### Vinculação merchant ↔ organization
Na primeira chamada `GET /merchants`, popula `ifood_merchant_link` automaticamente, vinculando cada merchant retornado à organização ativa do admin (matching por CNPJ ou seleção manual). Resolve o problema de "qual loja TrendFood corresponde a qual merchant iFood".

## Vídeos pra gravar depois

Com tudo pronto, vai ser **1 vídeo só** mostrando:
1. Abrir aba Merchant iFood no admin
2. Clicar "Rodar checklist" → 8 ✅ verdes
3. Mostrar uma interrupção sendo criada/deletada manualmente
4. Atualizar horários e verificar no portal iFood

## Fora de escopo (não vamos fazer agora)

- Implementação dos endpoints `/merchants/{id}/categories` e `/menu` (são da Catalog API, outra homologação)
- Webhooks push de mudança de status do iFood → TrendFood (a Merchant API é só consumida, não recebe webhooks)
