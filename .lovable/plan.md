

# Exibir próxima cobrança e histórico de pagamentos na SubscriptionTab

## Abordagem

Criar uma nova Edge Function `get-subscription-details` que consulta a API do Mercado Pago para buscar os dados da assinatura ativa (`mp_subscription_id`) e os pagamentos associados. O frontend chama essa função quando o plano é pago e exibe as informações.

## Implementação

### 1. Nova Edge Function `get-subscription-details`
- Recebe `org_id` do frontend autenticado.
- Busca `mp_subscription_id` da org no banco.
- Consulta `GET /preapproval/{id}` no MP para obter `next_payment_date` e `status`.
- Consulta `GET /preapproval/search?preapproval_id={id}` ou `GET /authorized_payments/search?preapproval_id={id}` para listar pagamentos realizados.
- Retorna JSON com `{ next_payment_date, status, payments: [{ date, amount, status }] }`.

### 2. Atualizar `supabase/config.toml`
- Adicionar `[functions.get-subscription-details]` com `verify_jwt = false`.

### 3. Atualizar `SubscriptionTab.tsx`
- Ao montar (se `isPaid` e org tem `mp_subscription_id`), chamar `get-subscription-details`.
- Exibir no card de status:
  - **Próxima cobrança**: data formatada (ex: "15 de março de 2026").
  - **Histórico de pagamentos**: tabela simples com data, valor e status (badge verde/vermelho) usando Collapsible para não poluir a UI.

### Detalhes Técnicos

- API MP para detalhes da assinatura: `GET /preapproval/{id}` → campo `next_payment_date`.
- API MP para pagamentos da assinatura: `GET /preapproval/{id}/authorized_payments` → lista de pagamentos com `date_created`, `transaction_amount`, `status`.
- O `mp_subscription_id` já está disponível no banco mas não é exposto ao frontend via `useAuth`. A edge function busca direto com service role key.

