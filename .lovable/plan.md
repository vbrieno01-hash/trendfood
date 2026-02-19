
# Esconder botao "Comecar Gratis" para usuarios logados

## Problema

Quando o usuario ja esta logado e esta no plano Gratis, o card do plano Free ainda exibe o botao "Comecar Gratis" que redireciona para `/auth` (pagina de criar conta/login). Isso nao faz sentido pois o usuario ja tem conta.

## Solucao

Para usuarios logados no plano Free, o botao deve exibir "Plano atual" e ficar desabilitado, igual ao comportamento dos outros planos quando ja estao ativos.

## Detalhes tecnicos

### Arquivo: `src/pages/PricingPage.tsx`

Alterar a logica do `onSelect` no PlanCard para incluir tambem o plano Free quando o usuario esta logado:

De:
```
onSelect={user && plan.key !== "free" ? () => handleSelectPlan(plan.key) : undefined}
```

Para:
```
onSelect={user ? (plan.key !== "free" ? () => handleSelectPlan(plan.key) : () => {}) : undefined}
```

Isso faz com que, quando logado, o card Free use o branch do `onSelect` no PlanCard (linhas 78-90), que ja tem a logica de exibir "Plano atual" quando `currentPlan` e `true` e desabilitar o botao.

Apenas uma linha precisa ser alterada. Nenhum outro arquivo precisa de mudanca.
