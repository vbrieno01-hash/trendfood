

# Implementar Assinaturas Recorrentes com Mercado Pago (Preapproval API)

## Situação Atual
O sistema usa pagamentos avulsos (`/v1/payments`). Após pagar, o plano fica ativo indefinidamente sem renovação automática. Não há cobrança recorrente nem bloqueio por falta de pagamento.

## Arquitetura Nova

```text
/planos → Dialog confirma → Edge Function cria preapproval no MP
                                    ↓
                         Retorna init_point (URL do MP)
                                    ↓
                         Usuário é redirecionado ao checkout do MP
                         (MP coleta cartão/dados de pagamento)
                                    ↓
                         MP cobra automaticamente todo mês
                                    ↓
              Webhook recebe notificações de status da assinatura
              (authorized → ativa plano, cancelled/paused → bloqueia)
```

## Etapas de Implementação

### 1. Migração de banco de dados
- Adicionar coluna `mp_subscription_id` (text, nullable) na tabela `organizations` para rastrear a assinatura ativa no MP.

### 2. Nova Edge Function `create-mp-subscription`
- Recebe `org_id` e `plan` do frontend autenticado.
- Chama `POST https://api.mercadopago.com/preapproval` com:
  - `reason`: "Assinatura Pro - NomeLoja"
  - `external_reference`: org_id
  - `payer_email`: email do usuário
  - `auto_recurring`: `{ frequency: 1, frequency_type: "months", transaction_amount: 99.00 ou 249.00, currency_id: "BRL" }`
  - `back_url`: URL de retorno ao dashboard
- Salva o `preapproval.id` na coluna `mp_subscription_id` da org.
- Retorna o `init_point` (URL hospedada do MP) para o frontend redirecionar.

### 3. Atualizar `mp-webhook` para tratar assinaturas
- Além de `type: "payment"`, tratar `type: "subscription_preapproval"`.
- Quando receber notificação de assinatura:
  - Buscar dados em `GET /preapproval/{id}`.
  - Se `status === "authorized"` → ativar plano (subscription_plan = plan, trial_ends_at = +30 dias).
  - Se `status === "cancelled"` ou `"paused"` → reverter para plano free.
  - Usar `external_reference` (org_id) para identificar a organização.
- Para pagamentos recorrentes aprovados (`type: "payment"` com subscription associada), renovar `trial_ends_at` em +30 dias.

### 4. Nova Edge Function `cancel-mp-subscription`
- Recebe `org_id` do frontend autenticado.
- Busca `mp_subscription_id` da org.
- Chama `PUT /preapproval/{id}` com `status: "cancelled"`.
- Atualiza org para plano free.

### 5. Atualizar `SubscriptionTab` (frontend)
- Remover formulário de checkout interno (PIX/cartão direto).
- Novo fluxo: ao selecionar plano → chamar `create-mp-subscription` → redirecionar para `init_point` (página do MP).
- Mostrar status da assinatura ativa (plano, próxima cobrança).
- Botão "Cancelar assinatura" que chama `cancel-mp-subscription`.
- Ao retornar do MP (via `back_url`), mostrar status atualizado.

### 6. Atualizar `PricingPage`
- Manter fluxo atual de seleção → dialog → mas ao confirmar, chamar `create-mp-subscription` diretamente e redirecionar para o `init_point` do MP (em vez de navegar para o dashboard).

### 7. Config TOML
- Adicionar entradas para as novas edge functions com `verify_jwt = false`.

## Detalhes Técnicos

- **API do MP usada**: `POST /preapproval` (assinaturas sem plano pré-cadastrado)
- **Webhook topics**: `subscription_preapproval` (mudança de status da assinatura) + `payment` (cada cobrança mensal)
- **Renovação automática**: O MP cobra o cartão mensalmente. Cada pagamento aprovado renova `trial_ends_at` em +30 dias via webhook.
- **Bloqueio automático**: Se MP não conseguir cobrar e cancelar a assinatura, o webhook recebe `status: cancelled` e o sistema reverte para plano free. O `usePlanLimits` já bloqueia funcionalidades quando `trial_ends_at` expira.
- **Edge functions existentes mantidas**: `create-mp-payment`, `check-subscription-pix` e `get-mp-public-key` continuam funcionando como fallback mas não serão mais o fluxo principal.

