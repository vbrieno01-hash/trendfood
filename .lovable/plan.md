
# Corrigir botoes de planos na pagina /planos

## Problema identificado
Quando o usuario NAO esta logado, os botoes dos planos se comportam de forma incorreta:

1. **Enterprise ("Assinar Enterprise")**: O botao abre `/auth` em uma **nova aba** do navegador (porque `external=true` gera um `<a target="_blank">`), em vez de navegar normalmente para a pagina de login.
2. **Pro e Free**: Funcionam corretamente, navegando para `/auth` via `<Link>`.

## Fluxo correto
O fluxo correto e: **criar conta primeiro, depois pagar**. O webhook da Cakto busca o usuario pelo email no banco de dados e retorna erro 404 se nao encontrar. Portanto:
- Usuario nao logado clicando em qualquer plano pago deve ir para `/auth` (navegacao normal, sem nova aba)
- Usuario logado clicando em Pro/Enterprise deve abrir o link de pagamento da Cakto (ja funciona)

## Correcao
No arquivo `src/pages/PricingPage.tsx`, na renderizacao do `PlanCard` (linha ~178-180):

**Antes:**
```tsx
onSelect={user ? (plan.key !== "free" ? () => handleSelectPlan(plan.key) : () => {}) : undefined}
external={!user ? plan.external : false}
ctaLink={!user ? "/auth" : plan.ctaLink}
```

**Depois:**
```tsx
onSelect={user ? (plan.key !== "free" ? () => handleSelectPlan(plan.key) : () => {}) : undefined}
external={false}
ctaLink={!user ? "/auth" : (plan.external ? plan.ctaLink : plan.ctaLink)}
```

A mudanca principal e: quando o usuario NAO esta logado, `external` deve ser **sempre `false`** para que todos os botoes usem `<Link>` (navegacao interna) em vez de `<a target="_blank">`.

Quando o usuario ESTA logado, o Enterprise usa `onSelect` (que chama `handleSelectPlan` e abre o Cakto), entao o `external` tambem pode ser `false` sem impacto.

## Impacto
- Correcao de 1 linha no arquivo `src/pages/PricingPage.tsx`
- Nenhuma alteracao no banco de dados ou edge functions
- O fluxo "criar conta -> pagar" continua garantido
