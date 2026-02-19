
# Integrar Stripe para Pagamento de Assinaturas

## Resumo

Quando o cliente clicar em "Assinar Pro" ou "Assinar Enterprise", ele sera redirecionado para uma pagina de checkout do Stripe. Apos o pagamento, o Stripe notifica o sistema via webhook, que atualiza automaticamente o plano da organizacao no banco de dados.

## Fluxo do usuario

```text
Dashboard -> Clica "Assinar Pro" -> Pagina de Planos
  -> Clica no botao do plano -> Redirecionado ao Checkout Stripe
    -> Paga com cartao -> Stripe confirma
      -> Webhook atualiza subscription_plan e subscription_status
        -> Usuario volta ao Dashboard com plano ativo
```

## O que sera feito

### 1. Habilitar integracao Stripe
- Conectar o Stripe ao projeto usando a integracao nativa do Lovable
- Configurar produtos e precos (Pro R$99/mes, Enterprise R$249/mes)

### 2. Edge Function: create-checkout (nova)
- Recebe o plano desejado (pro/enterprise) e o ID da organizacao
- Cria uma sessao de checkout no Stripe com:
  - Preco correto do plano
  - URL de sucesso (volta ao dashboard)
  - URL de cancelamento (volta a pagina de planos)
  - Metadata com org_id para identificar a organizacao no webhook
- Retorna a URL do checkout para o frontend

### 3. Edge Function: stripe-webhook (nova)
- Escuta eventos do Stripe (checkout.session.completed, customer.subscription.updated, customer.subscription.deleted)
- Quando o pagamento e confirmado:
  - Atualiza `subscription_plan` para "pro" ou "enterprise"
  - Atualiza `subscription_status` para "active"
  - Remove `trial_ends_at` (nao precisa mais de trial)
- Quando a assinatura e cancelada:
  - Atualiza `subscription_plan` para "free"
  - Atualiza `subscription_status` para "active" (volta ao plano gratis)

### 4. Atualizar pagina de Planos (PricingPage.tsx)
- Para usuarios logados: botao "Assinar Pro" chama a edge function create-checkout e redireciona ao Stripe
- Para usuarios nao logados: botao continua redirecionando para /auth (cadastro)
- Adicionar estado de loading no botao durante o redirecionamento

### 5. Atualizar PlanCard.tsx
- Aceitar uma prop `onSelect` opcional (callback ao clicar)
- Quando `onSelect` esta presente, usar onClick em vez de Link

### 6. Adicionar coluna stripe_customer_id na tabela organizations
- Nova coluna para vincular a organizacao ao cliente Stripe
- Permite gerenciar assinaturas futuras (cancelamento, upgrade, etc.)

## Detalhes tecnicos

**Banco de dados (migracao):**
- Adicionar coluna `stripe_customer_id` (text, nullable) na tabela `organizations`
- Adicionar coluna `stripe_subscription_id` (text, nullable) na tabela `organizations`

**Edge Function create-checkout:**
- Verifica autenticacao do usuario
- Busca ou cria customer no Stripe usando o email do usuario
- Salva `stripe_customer_id` na organizacao
- Cria sessao de checkout com mode: "subscription"
- Retorna checkout URL

**Edge Function stripe-webhook:**
- Valida assinatura do webhook usando STRIPE_WEBHOOK_SECRET
- Processa eventos: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- Usa service role key para atualizar a tabela organizations

**Frontend (PricingPage.tsx):**
- Importa `supabase` client
- Chama `supabase.functions.invoke('create-checkout', { body: { plan, orgId } })`
- Redireciona com `window.location.href = checkoutUrl`

**Secrets necessarios:**
- STRIPE_SECRET_KEY (chave secreta do Stripe)
- STRIPE_WEBHOOK_SECRET (secret do webhook)
