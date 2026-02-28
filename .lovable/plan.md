

# Plano: Polling automático no QR Code PIX da assinatura

## Alterações

### 1. Criar edge function `check-subscription-pix` 
Nova edge function em `supabase/functions/check-subscription-pix/index.ts` que:
- Recebe `payment_id` e `org_id`
- Consulta o status do pagamento na API do Mercado Pago usando o `MERCADO_PAGO_ACCESS_TOKEN`
- Se `status === "approved"`, atualiza a organização (`subscription_plan`, `subscription_status`, `trial_ends_at`) e registra em `activation_logs`
- Retorna `{ paid: boolean, status: string }`

### 2. Atualizar `src/components/dashboard/SubscriptionTab.tsx`
- Adicionar `useEffect` com `setInterval` de 10s na tela do QR Code PIX (linhas 288-339)
- A cada 10s, invocar `check-subscription-pix` passando `pixData.payment_id` e `organization.id`
- Quando `paid === true`: mostrar toast de sucesso, chamar `handleBack()` para voltar à tela de planos
- Mostrar indicador visual "Aguardando pagamento..." com spinner animado
- Limpar o intervalo no cleanup do useEffect e quando o pagamento é confirmado

### Detalhes técnicos
- O polling usa a mesma abordagem do `useCheckPixStatus` existente (checkout de pedidos), adaptada para assinaturas
- O token do MP já está configurado como secret (`MERCADO_PAGO_ACCESS_TOKEN`)
- A edge function usa `SUPABASE_SERVICE_ROLE_KEY` para atualizar a organização (bypass RLS)

