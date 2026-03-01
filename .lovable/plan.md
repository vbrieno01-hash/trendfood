

## Plano: Botão "Plano atual" desabilitado para todos os planos

### Problema
Quando `currentPlan` é `true` mas `onSelect` é `undefined`, o `PlanCard` cai no branch do `Link` ou `external`, renderizando um botão clicável em vez de um botão desabilitado. Isso afeta o plano Grátis e qualquer plano ativo.

### Correção

**Arquivo: `src/components/pricing/PlanCard.tsx`**
- Reorganizar a lógica de renderização do botão: se `currentPlan === true`, sempre renderizar um `Button` desabilitado com texto "Plano atual" e aparência semi-transparente (`opacity-60`), independente de `onSelect` estar definido ou não.
- Mover a checagem de `currentPlan` para ser a PRIMEIRA condição, antes de `onSelect`, `external` e `Link`.

### Detalhes Técnicos
A mudança é apenas no componente `PlanCard.tsx`. A lógica do botão passará de:
```
if (onSelect) → Button com onClick
else if (external) → <a>
else → <Link>
```
Para:
```
if (currentPlan) → Button disabled + opacity-60 + "Plano atual"
else if (onSelect) → Button com onClick
else if (external) → <a>
else → <Link>
```

Nenhuma alteração em `SubscriptionTab`, `PricingPage`, `Index` ou banco de dados.

