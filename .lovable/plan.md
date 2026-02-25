

# Plano: Painel Admin Self-Service para Planos, Webhooks e Trial

## Problema

Atualmente os planos, preços, links de checkout e duração do trial estão hardcoded no código. Qualquer mudança exige intervenção do desenvolvedor.

## O que será feito

Criar uma seção completa na aba **Configurações** do painel admin onde você poderá:
- Criar, editar e remover planos (nome, preço, features, destaque)
- Configurar a URL de checkout (Cakto) e o webhook secret de cada plano
- Definir a duração padrão do trial (em dias) para novas lojas
- Tudo salvo no banco de dados e consumido dinamicamente pela página de Preços e pelos webhooks

## Seção técnica

### 1. Nova tabela: `platform_plans`

Armazena a configuração de cada plano editável pelo admin.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| key | text UNIQUE | Identificador (ex: "free", "pro", "enterprise") |
| name | text | Nome exibido (ex: "Pro") |
| price_cents | integer | Preço em centavos (0 para grátis) |
| description | text | Descrição curta |
| features | jsonb | Array de strings das features |
| highlighted | boolean | Se é o plano "Recomendado" |
| badge | text | Texto da badge (ex: "Recomendado") |
| checkout_url | text | Link de pagamento Cakto |
| webhook_secret_name | text | Nome do secret do webhook (ex: "CAKTO_WEBHOOK_SECRET_PRO") |
| sort_order | integer | Ordem de exibição |
| active | boolean | Se o plano está visível |
| created_at | timestamptz | |

RLS: SELECT público (a página de preços precisa ler), INSERT/UPDATE/DELETE restrito a admin.

### 2. Coluna nova em `platform_config`: `default_trial_days`

Adicionar coluna `default_trial_days integer NOT NULL DEFAULT 7` na tabela `platform_config` existente. Esse valor será usado no cálculo do `trial_ends_at` de novas organizações.

### 3. Atualizar o trigger/default de `organizations.trial_ends_at`

Atualmente o default é `now() + '7 days'`. Será alterado para uma function que lê `platform_config.default_trial_days` e calcula dinamicamente.

### 4. Novo componente: `src/components/admin/PlansConfigSection.tsx`

Seção na aba Configurações do admin com:

- **Tabela de planos** editável (nome, preço, descrição, features, checkout URL, badge, destaque, ordem)
- Botão **"Adicionar Plano"** que abre formulário inline
- Botão **"Editar"** em cada plano para edição inline
- Botão **"Excluir"** com confirmação
- **Campo "Dias de Trial Padrão"** separado, editável, que salva em `platform_config`

### 5. Novo componente: `src/components/admin/TrialConfigSection.tsx`

Campo simples para editar `default_trial_days` no `platform_config`.

### 6. Atualizar `src/pages/PricingPage.tsx`

- Remover os planos hardcoded
- Buscar planos da tabela `platform_plans` ordenados por `sort_order`
- Montar os cards dinamicamente
- Buscar `checkout_url` do banco em vez do objeto `caktoLinks` hardcoded

### 7. Atualizar `src/hooks/usePlanLimits.ts`

- A lógica de features por plano (FEATURE_ACCESS) permanece no código pois é lógica de negócio de acesso
- Os planos do banco controlam apenas exibição e checkout

### 8. Atualizar webhooks dinâmicos

Os edge functions `cakto-webhook-pro` e `cakto-webhook-enterprise` continuam funcionando como estão, pois usam secrets nomeados. O campo `webhook_secret_name` no banco serve apenas como referência visual para o admin saber qual secret corresponde a qual plano.

### 9. Integração na aba Config do AdminPage

Adicionar `PlansConfigSection` e `TrialConfigSection` na aba "config" junto com `PlatformConfigSection` e `AdminDownloadsSection`.

### Arquivos alterados/criados

```text
NOVO:  migration SQL (platform_plans + default_trial_days)
NOVO:  src/components/admin/PlansConfigSection.tsx
NOVO:  src/components/admin/TrialConfigSection.tsx
EDIT:  src/pages/AdminPage.tsx (importar novos componentes na aba config)
EDIT:  src/pages/PricingPage.tsx (buscar planos do banco)
EDIT:  src/hooks/usePlanLimits.ts (manter, sem mudanças)
```

### Seed dos planos iniciais

A migration incluirá INSERT dos 3 planos atuais (free, pro, enterprise) com os dados que já existem hardcoded, para que nada quebre na transição.

