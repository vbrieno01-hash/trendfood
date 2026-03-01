

## Plano: Esconder botão "Plano atual" no plano Grátis

### Problema
Quando uma loja cria uma conta, o plano Grátis é o padrão. O botão "Plano atual" no card Grátis deve ficar **invisível** (não renderizado), já que não faz sentido mostrar — o usuário nunca vai "assinar" o Grátis.

### Correção

**Arquivo: `src/components/pricing/PlanCard.tsx`**
- Na seção do botão, quando `currentPlan === true` **e** o preço for "Grátis" (ou `price === "Grátis"`), não renderizar nenhum botão (retornar `null`)
- Para os demais planos pagos que sejam o plano atual, continuar mostrando o botão "Plano atual" desabilitado como já está

Lógica:
```
if (currentPlan && price === "Grátis") → null (sem botão)
if (currentPlan) → Button disabled "Plano atual"
else if (onSelect) → Button com onClick
else if (external) → <a>
else → <Link>
```

