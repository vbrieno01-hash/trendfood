

## Plano: Selo "Powered by TrendFood" no rodapé do cardápio

### O que muda
O footer do cardápio (`UnitPage.tsx`, linhas 828-842) será condicional com base no `effectivePlan` do `planLimits` (já disponível na linha 59).

### Implementação

**Editar `src/pages/UnitPage.tsx` — bloco do footer (linhas 828-842):**

- Se `planLimits.effectivePlan === "free"`: mostrar o footer atual com a frase **"Powered by TrendFood — Crie seu cardápio grátis"** linkando para `/`
- Se plano for `pro`, `enterprise` ou `lifetime`: ocultar o footer completamente (não renderizar nada)

O `planLimits` já está importado e inicializado na linha 59 (`const planLimits = usePlanLimits(org)`), então basta usar `planLimits.effectivePlan` no JSX condicional.

