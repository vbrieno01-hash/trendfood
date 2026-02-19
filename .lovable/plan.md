

# Corrigir botao Enterprise abrindo WhatsApp

## Problema

Quando o usuario esta logado e clica em "Assinar Enterprise", o botao redireciona para o WhatsApp em vez de abrir o checkout do Stripe. Isso acontece porque o codigo atual exclui o plano Enterprise do `onSelect` (linha 197-198) e o `ctaLink` ainda aponta para o link do WhatsApp.

## Solucao

Alterar o `PricingPage.tsx` para que, quando o usuario estiver logado, o plano Enterprise tambem use `handleSelectPlan` (que chama a edge function `create-checkout`), da mesma forma que o plano Pro.

## Detalhes tecnicos

No arquivo `src/pages/PricingPage.tsx`, duas mudancas sao necessarias:

1. **Linha 196-199**: Remover a condicao que exclui o Enterprise do `onSelect`. Mudar de:
```
onSelect={user ? plan.key !== "enterprise" ? () => handleSelectPlan(plan.key) : undefined : undefined}
```
Para:
```
onSelect={user && plan.key !== "free" ? () => handleSelectPlan(plan.key) : undefined}
```

2. **Linha 201**: Ajustar a logica de `external` para que, quando logado, nenhum plano seja externo:
```
external={!user ? plan.external : false}
```

Com isso, o botao Enterprise para usuarios logados chamara o Stripe checkout normalmente, e para usuarios nao logados continuara redirecionando para `/auth`.
