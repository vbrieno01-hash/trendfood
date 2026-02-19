

# Migracao Stripe para Cakto

## Resumo
Substituir toda a integracao com Stripe pela Cakto, usando dois webhooks separados (Pro e Enterprise) e links de checkout diretos.

## Dados da Integracao

| Item | Valor |
|------|-------|
| Link Checkout Pro (R$ 99) | `https://pay.cakto.com.br/ad3b2o7_776555` |
| Link Checkout Enterprise (R$ 249) | `https://pay.cakto.com.br/39s38ju_776565` |
| Secret Webhook Pro | `e10efc28-176c-4e00-9e22-9b47a8f1b9f6` |
| Secret Webhook Enterprise | `2d8835fd-b251-4112-b3e6-90b2ccab060e` |

## URLs para configurar na Cakto

Apos a implementacao, configure na Cakto:

- **Webhook do produto Pro**: `https://xrzudhylpphnzousilye.supabase.co/functions/v1/cakto-webhook-pro`
- **Webhook do produto Enterprise**: `https://xrzudhylpphnzousilye.supabase.co/functions/v1/cakto-webhook-enterprise`

## Etapas de Implementacao

### 1. Adicionar secrets
Salvar dois secrets no backend:
- `CAKTO_WEBHOOK_SECRET_PRO` = `e10efc28-176c-4e00-9e22-9b47a8f1b9f6`
- `CAKTO_WEBHOOK_SECRET_ENTERPRISE` = `2d8835fd-b251-4112-b3e6-90b2ccab060e`

### 2. Criar Edge Function `cakto-webhook-pro`
- Recebe POST da Cakto quando pagamento Pro e aprovado
- Valida o secret do header contra `CAKTO_WEBHOOK_SECRET_PRO`
- Identifica o email do comprador no payload
- Atualiza `organizations.subscription_plan = 'pro'` e `subscription_status = 'active'` para o usuario correspondente
- JWT desabilitado (webhook publico)

### 3. Criar Edge Function `cakto-webhook-enterprise`
- Identica a anterior, mas valida contra `CAKTO_WEBHOOK_SECRET_ENTERPRISE`
- Atualiza `subscription_plan = 'enterprise'`

### 4. Atualizar `PricingPage.tsx`
- Remover chamada ao `create-checkout` do Stripe
- Pro: abrir `https://pay.cakto.com.br/ad3b2o7_776555?email={user.email}` em nova aba
- Enterprise: abrir `https://pay.cakto.com.br/39s38ju_776565?email={user.email}` em nova aba
- Simplificar logica de loading

### 5. Atualizar `SettingsTab.tsx`
- Remover integracao com `customer-portal` do Stripe
- Botao "Gerenciar assinatura" para planos pagos redireciona para `/planos` (ou abre WhatsApp de suporte)
- Manter exibicao do plano atual

### 6. Simplificar `useAuth.tsx`
- Remover funcao `checkSubscription` que chamava `check-subscription`
- Remover `setInterval` de 60 segundos
- Manter apenas o carregamento da organizacao

### 7. Deletar Edge Functions do Stripe
Remover as funcoes que nao serao mais utilizadas:
- `create-checkout`
- `check-subscription`
- `customer-portal`

### 8. Atualizar `supabase/config.toml`
Adicionar as duas novas funcoes com `verify_jwt = false`.

## Apos Implementacao
Voce precisara colar as URLs dos webhooks no painel da Cakto:
- Produto Pro: `https://xrzudhylpphnzousilye.supabase.co/functions/v1/cakto-webhook-pro`
- Produto Enterprise: `https://xrzudhylpphnzousilye.supabase.co/functions/v1/cakto-webhook-enterprise`

