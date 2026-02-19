

# Migrar de Stripe para Cakto -- Pagamentos por Link + Webhook

## Resumo

Substituir toda a integracao com Stripe por links de checkout da Cakto e um webhook para processar eventos de pagamento. Os botoes de assinar abrirao links externos da Cakto (com o email do usuario como parametro na URL), e um novo endpoint de webhook recebera notificacoes de compra aprovada, cancelamento e reembolso para atualizar o plano do usuario no banco de dados.

## Antes de comecar: Links necessarios

Voce mencionou que forneceria os links da Cakto, mas eles nao foram colados. Vou usar placeholders por enquanto. Apos a implementacao, voce precisara substituir pelos links reais:

- **Pro (R\$ 99)**: `https://pay.cakto.com.br/SEU_LINK_PRO`
- **Enterprise (R\$ 249)**: `https://pay.cakto.com.br/SEU_LINK_ENTERPRISE`

Os links devem aceitar o parametro `?email=` na URL para vincular o comprador ao usuario do TrendFood.

---

## Alteracoes

### 1. PricingPage.tsx -- Simplificar para links externos

Remover a chamada a `create-checkout` (edge function do Stripe). Em vez disso, ao clicar em "Assinar Pro" ou "Assinar Enterprise", abrir o link da Cakto em nova aba, passando `?email={user.email}` como parametro.

- Remover `supabase.functions.invoke("create-checkout")`
- Remover estado `loadingPlan` (nao e mais necessario, pois e um simples `window.open`)
- Os botoes passam a ser links externos com `window.open(caktoUrl + "?email=" + user.email)`

### 2. SettingsTab.tsx -- Remover portal do Stripe

Substituir o botao "Gerenciar assinatura" (que chamava `customer-portal` do Stripe) por um link para a pagina de planos `/planos` ou informacoes de contato para cancelamento.

### 3. useAuth.tsx -- Remover check-subscription periodico

Remover a chamada periodica a `check-subscription` (que consultava a API do Stripe). O plano agora sera atualizado exclusivamente via webhook, e o frontend ja le o `subscription_plan` da tabela `organizations`.

- Remover a funcao `checkSubscription`
- Remover o `setInterval` de 60s
- O plano continua sendo lido do banco normalmente via `fetchOrganization`

### 4. Nova Edge Function: `cakto-webhook`

Criar `supabase/functions/cakto-webhook/index.ts` -- endpoint publico (sem JWT) que recebe POST da Cakto.

Logica:
1. Validar o `secret` do webhook (comparar com segredo armazenado como variavel de ambiente `CAKTO_WEBHOOK_SECRET`)
2. Extrair o `event` (custom_id) do payload: `purchase_approved`, `subscription_canceled`, `refunded`, etc.
3. Extrair `customer.email` para identificar o usuario
4. Mapear `product.id` para o plano (`pro` ou `enterprise`) usando um dicionario configuravel
5. Buscar a organizacao pelo email do usuario (`auth.users` -> `organizations.user_id`)
6. Atualizar `subscription_plan` e `subscription_status` na tabela `organizations`

Eventos tratados:
- `purchase_approved` com status `paid` -> atualiza plano para `pro` ou `enterprise`, status `active`
- `subscription_canceled` / `refunded` / `chargedback` -> retorna plano para `free`, status `inactive`

### 5. Segredo do Webhook

Sera necessario configurar o segredo `CAKTO_WEBHOOK_SECRET` (o valor do campo `secret` do webhook na Cakto) e `CAKTO_PRO_PRODUCT_ID` e `CAKTO_ENTERPRISE_PRODUCT_ID` como variaveis de ambiente.

### 6. Remover Edge Functions do Stripe

As seguintes funcoes nao serao mais necessarias:
- `supabase/functions/create-checkout/index.ts` -- removida
- `supabase/functions/check-subscription/index.ts` -- removida
- `supabase/functions/customer-portal/index.ts` -- removida

### 7. Config TOML

Adicionar configuracao para a nova funcao com `verify_jwt = false` (webhooks sao publicos).

---

## Seguranca do Webhook

O webhook da Cakto envia um campo `secret` configurado ao criar o webhook na plataforma. A edge function validara esse segredo comparando com o valor armazenado em `CAKTO_WEBHOOK_SECRET`. Requisicoes sem o segredo correto serao rejeitadas com 401.

---

## Fluxo pos-implementacao

```text
Usuario clica "Assinar Pro"
       |
       v
Abre link Cakto com ?email=user@email.com
       |
       v
Usuario paga na Cakto
       |
       v
Cakto envia webhook POST para /cakto-webhook
       |
       v
Edge Function valida secret, identifica plano pelo product.id
       |
       v
Atualiza organizations.subscription_plan = "pro"
       |
       v
Usuario volta ao Dashboard (redirect da Cakto)
       |
       v
Frontend le plano atualizado do banco -> funcionalidades liberadas
```

---

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| `src/pages/PricingPage.tsx` | Simplificar para links externos Cakto |
| `src/components/dashboard/SettingsTab.tsx` | Remover portal Stripe |
| `src/hooks/useAuth.tsx` | Remover check-subscription periodico |
| `supabase/functions/cakto-webhook/index.ts` | Criar (novo) |
| `supabase/functions/create-checkout/index.ts` | Remover |
| `supabase/functions/check-subscription/index.ts` | Remover |
| `supabase/functions/customer-portal/index.ts` | Remover |
| `supabase/config.toml` | Adicionar config do cakto-webhook |

Nenhuma alteracao de banco de dados necessaria -- a coluna `subscription_plan` ja existe.

