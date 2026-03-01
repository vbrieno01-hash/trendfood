

## Plano: Permitir trocar de ciclo de cobrança (mensal → anual)

### Problema
Quando o usuário está no plano Pro **mensal** e ativa o toggle **Anual**, o botão do Pro continua como "Plano atual" desabilitado. Ele não consegue assinar o plano anual do mesmo plano.

### Solução
Quando o toggle está em **Anual** e o plano atual do usuário é mensal (ou vice-versa), o botão do plano atual deve ser clicável com texto como "Mudar para anual".

### Alterações

**1. `src/components/pricing/PlanCard.tsx`**
- Adicionar prop `billingMismatch?: boolean` — indica que o usuário está no plano mas com ciclo diferente
- Quando `currentPlan && billingMismatch && onSelect`: renderizar botão clicável com texto do `cta` (ex: "Mudar para anual")
- Quando `currentPlan && !billingMismatch`: manter "Plano atual" desabilitado (comportamento atual)

**2. `src/components/dashboard/SubscriptionTab.tsx`**
- Verificar o `billing_cycle` da organização (campo `organization.billing_cycle`)
- Calcular se há diferença de ciclo: `isAnnual && billingCycle !== 'annual'` ou `!isAnnual && billingCycle !== 'monthly'`
- Passar `billingMismatch` e manter `onSelect` ativo mesmo para o plano atual quando há diferença de ciclo
- Ajustar o `cta` para "Mudar para anual" ou "Mudar para mensal"

**3. `src/pages/PricingPage.tsx`**
- Aplicar a mesma lógica de `billingMismatch` usando `organization?.billing_cycle`

**4. `src/components/dashboard/UpgradeDialog.tsx`**
- Aplicar a mesma lógica (UpgradeDialog já filtra planos pagos, mas precisa da mesma prop)

### Lógica resumida
```
const billingCycle = organization?.billing_cycle || 'monthly';
const billingMismatch = currentPlan === plan.key && (
  (isAnnual && billingCycle !== 'annual') || 
  (!isAnnual && billingCycle === 'annual')
);

// No PlanCard:
onSelect={
  (plan.key !== currentPlan || billingMismatch) && !isLifetime
    ? () => handleSubscribe(plan.key)
    : undefined
}
```

**Também corrigir**: O card do plano Grátis mostra "Plano atual" quando o usuário está no Pro — isso é um bug separado. O `onSelect` não está `undefined` para Free, mas o botão renderiza como "Plano atual". Preciso verificar se há conflito.

