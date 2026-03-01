

## Plano: Cancelamento inteligente com distinção mensal/anual e acesso até expiração

### Problemas atuais
1. O modal de cancelamento não diferencia plano mensal de anual -- mostra sempre a mesma mensagem
2. A edge function reverte imediatamente para `subscription_plan: "free"`, removendo acesso na hora
3. O texto diz "funcionalidades serão desativadas imediatamente" -- errado para planos anuais

### Alterações

**1. Frontend: `src/components/dashboard/SubscriptionTab.tsx`**
- Detectar `billing_cycle` da organização (`organization.billing_cycle`)
- Se `billing_cycle === "annual"`: mostrar modal diferente com aviso de multa de 20% e que o acesso continua até o fim do período pago
- Se `billing_cycle === "monthly"`: manter modal atual mas ajustar texto para dizer que acesso continua até a data de expiração (não "imediatamente")
- Passar `billing_cycle` para a edge function no body da requisição

**2. Edge Function: `supabase/functions/cancel-mp-subscription/index.ts`**
- Receber `billing_cycle` no body (ou ler da org no banco)
- Cancelar no Mercado Pago (já funciona)
- **Não** mudar `subscription_plan` para "free" imediatamente
- Em vez disso: mudar apenas `subscription_status` para `"cancelled"` e manter o plano atual + `trial_ends_at` intacto
- O sistema de `usePlanLimits` já reverte automaticamente para "free" quando `trial_ends_at` expira (via `subscriptionExpired`)

**3. Frontend: Ajustar toast de sucesso**
- Trocar "Seu plano foi revertido para Grátis" por "Sua assinatura foi cancelada. O acesso continua até {data de expiração}."

### Modal para plano anual (texto)
```
Atenção: Seu plano anual possui multa de rescisão de 20% 
sobre o saldo restante, conforme os Termos de Uso. 
O acesso continuará disponível até o fim do período já pago.
```

### Modal para plano mensal (texto)
```
Ao cancelar, a cobrança recorrente será interrompida. 
Você continuará com acesso aos recursos até o fim do 
período atual.
```

### Lógica resumida da edge function
```
// Antes: subscription_plan = "free" (acesso perdido imediatamente)
// Depois: subscription_status = "cancelled" (acesso mantido até trial_ends_at)

await supabaseAdmin
  .from("organizations")
  .update({
    subscription_status: "cancelled",
    mp_subscription_id: null,
    // NÃO muda subscription_plan -- mantém pro/enterprise
  })
  .eq("id", org_id);
```

O `usePlanLimits` já cuida de revogar acesso quando `trial_ends_at` expirar, pois `subscriptionExpired` retorna `true` e `effectivePlan` vira `"free"`.

