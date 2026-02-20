

# Corrigir badge "Seu plano" para visitantes nao logados

## Problema
Na pagina `/planos`, o badge "Seu plano" aparece no card do plano Gratis mesmo para visitantes que nao estao logados. Isso acontece porque `currentPlan` recebe o valor padrao `"free"` quando nao existe organizacao, fazendo `currentPlan === plan.key` ser `true` para o plano Gratis.

## Correcao
No arquivo `src/pages/PricingPage.tsx`, alterar a prop `currentPlan` do `PlanCard` para so marcar como plano atual quando o usuario estiver autenticado:

```tsx
// Antes (linha ~176):
currentPlan={currentPlan === plan.key}

// Depois:
currentPlan={!!user && currentPlan === plan.key}
```

## Impacto
- 1 linha alterada em `src/pages/PricingPage.tsx`
- Visitantes nao logados nao verao mais o badge "Seu plano" em nenhum card
- Usuarios logados continuarao vendo o badge normalmente no plano correto

