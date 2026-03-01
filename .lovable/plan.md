

## Plano: Corrigir cancelamento de assinatura sem mp_subscription_id

### Problema
A organização TrendFood (e provavelmente outras ativadas manualmente pelo admin) tem `mp_subscription_id = null`. A edge function `cancel-mp-subscription` retorna erro "No active subscription" quando esse campo é nulo, impedindo o cancelamento.

### Solução
Modificar a edge function para que, quando não houver `mp_subscription_id`, ela **pule a chamada à API do Mercado Pago** e simplesmente reverta a organização para o plano Grátis.

### Alteração

**Arquivo: `supabase/functions/cancel-mp-subscription/index.ts`**
- Remover o bloqueio que retorna erro 400 quando `mp_subscription_id` é null
- Só chamar a API do Mercado Pago se `mp_subscription_id` existir
- Sempre executar o downgrade para free e o log de auditoria

Lógica:
```
// Antes: retornava erro
if (!org.mp_subscription_id) return error 400

// Depois: cancela no MP apenas se houver ID
if (org.mp_subscription_id) {
  // chama API do MP para cancelar
}

// Sempre: downgrade para free + log
```

