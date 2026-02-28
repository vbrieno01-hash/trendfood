

# Plano: Melhorar feedback de status do pagamento por cartão

## Problema
Quando o cartão é rejeitado (sem saldo, dados inválidos, fraude), o frontend mostra uma mensagem genérica. O lojista não sabe exatamente o que aconteceu.

## Alterações

### 1. `supabase/functions/create-mp-payment/index.ts`
- Quando `mpData.status !== "approved"`, retornar também `status_detail` do MP (ex: `cc_rejected_insufficient_amount`, `cc_rejected_bad_filled_security_code`, etc.)
- Logar o status_detail no console para debug

### 2. `src/components/dashboard/SubscriptionTab.tsx`
- Mapear os `status_detail` do MP para mensagens em português amigáveis:
  - `cc_rejected_insufficient_amount` → "Saldo insuficiente no cartão"
  - `cc_rejected_bad_filled_security_code` → "CVV incorreto"
  - `cc_rejected_bad_filled_date` → "Data de validade incorreta"
  - `cc_rejected_high_risk` → "Pagamento recusado por análise de segurança"
  - etc.
- Mostrar toast com a mensagem específica ao invés de genérica
- Quando status é `in_process`, mostrar toast informativo "Pagamento em análise, você será notificado"

## Resultado
O lojista saberá exatamente por que o pagamento foi recusado e poderá tentar novamente com outro cartão ou corrigir os dados.

