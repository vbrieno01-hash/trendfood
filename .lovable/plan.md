

## Plano: Reverter transparência do card, manter só botão desabilitado

### Problema
O card inteiro ficou transparente (`opacity-60 pointer-events-none`), mas o pedido era apenas para o **botão** ficar desabilitado. O card deve manter sua aparência normal.

### Correção

**Arquivo: `src/components/pricing/PlanCard.tsx`**
- Remover `opacity-60 pointer-events-none` do container `<div>` do card
- Manter apenas `ring-2 ring-primary` quando `currentPlan` é true (para destacar visualmente)
- O botão já está correto: renderiza "Plano atual" desabilitado quando `currentPlan === true`
- Remover o `opacity-60` do botão disabled também — deixar apenas `disabled` natural

Mudança única na linha do `cn()`:
```
// DE:
currentPlan && "ring-2 ring-primary opacity-60 pointer-events-none"
// PARA:
currentPlan && "ring-2 ring-primary"
```

