
## Plano: Tornar a verificação do Grátis mais robusta

### Problema
A lógica atual no `PlanCard.tsx` verifica `price === "Grátis"` para esconder o botão, mas isso depende do texto exato do preço. Vou trocar para uma verificação mais confiável usando `price === "Grátis" || price === "R$ 0"` e também garantir que nenhum outro caminho renderize o botão para o plano gratuito quando logado.

### Alteração

**Arquivo: `src/components/pricing/PlanCard.tsx`**
- Trocar a verificação de `price === "Grátis"` para `price === "Grátis" || price === "R$ 0" || price === "0"` para cobrir qualquer formatação possível

**Arquivo: `src/components/dashboard/SubscriptionTab.tsx`**
- No card do plano Free, quando `isSamePlan` é `true`, NÃO passar `onSelect` (já é assim, mas confirmar que `billingMismatch` não ativa por engano para o plano free)
- Verificar que o plano free nunca receba `billingMismatch = true`

**Arquivo: `src/pages/PricingPage.tsx`**
- Mesma verificação: garantir que o plano free com `currentPlan=true` nunca tenha `onSelect` nem `billingMismatch`

A mudança é mínima — apenas blindar a lógica contra edge cases de formatação.
