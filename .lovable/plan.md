

# Implementar Pagamento com Stripe

## Resumo

O Stripe ja esta habilitado e os produtos foram criados:
- **Pro**: R$ 99/mes (price_1T2c1KLp69ds1uZn22cFIqbO / prod_U0dHItuetrHRdN)
- **Enterprise**: R$ 249/mes (price_1T2c2WLp69ds1uZnFUojrhIp / prod_U0dJWUh6LviRiy)

Agora vamos implementar o fluxo completo de checkout e verificacao de assinatura.

## Fluxo do usuario

```text
Pagina de Planos -> Clica "Assinar Pro"
  -> Edge function cria sessao no Stripe
    -> Redireciona para checkout do Stripe
      -> Paga com cartao
        -> Volta ao dashboard com ?checkout=success
          -> check-subscription sincroniza o plano no banco
```

## O que sera feito

### 1. Configurar edge functions no config.toml
- Adicionar entradas para `create-checkout`, `check-subscription` e `customer-portal` com `verify_jwt = false`

### 2. Edge Function: create-checkout
- Autentica o usuario via token
- Recebe o plano desejado (pro/enterprise) e o orgId
- Busca ou cria customer no Stripe pelo email
- Cria sessao de checkout com o preco correto
- Retorna URL do checkout para redirecionamento

### 3. Edge Function: check-subscription
- Autentica o usuario via token
- Busca customer no Stripe pelo email
- Verifica se tem assinatura ativa
- Identifica o plano pelo product ID
- Sincroniza subscription_plan e subscription_status na tabela organizations
- Chamada no login, ao carregar a pagina e periodicamente

### 4. Edge Function: customer-portal
- Permite ao usuario gerenciar sua assinatura (cancelar, trocar cartao)
- Cria sessao do Stripe Customer Portal
- Retorna URL para redirecionamento

### 5. Atualizar PlanCard.tsx
- Aceitar prop `onSelect` opcional
- Quando presente, renderizar botao com onClick em vez de Link
- Aceitar prop `loading` para estado de carregamento

### 6. Atualizar PricingPage.tsx
- Para usuarios logados: botao chama create-checkout e redireciona ao Stripe
- Para usuarios nao logados: botao continua redirecionando para /auth
- Estado de loading durante o redirecionamento
- Destacar o plano atual do usuario (se ja assinante)

### 7. Integrar check-subscription no AuthContext
- Chamar check-subscription apos login e ao carregar sessao
- Atualizar subscription_plan da organizacao no estado global
- Refresh periodico a cada 60 segundos

## Detalhes tecnicos

**Mapeamento de produtos Stripe:**
```text
pro:       price_1T2c1KLp69ds1uZn22cFIqbO / prod_U0dHItuetrHRdN
enterprise: price_1T2c2WLp69ds1uZnFUojrhIp / prod_U0dJWUh6LviRiy
```

**Edge functions usam:**
- STRIPE_SECRET_KEY (ja configurado)
- SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ja disponiveis)

**Nenhuma migracao de banco necessaria** - o check-subscription sincroniza os campos subscription_plan e subscription_status ja existentes na tabela organizations.

