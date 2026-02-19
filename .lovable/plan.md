
# Correção: Tela branca na página pública

## Causa raiz identificada

O erro no console é:

```
Error: Rendered more hooks than during the previous render.
at useDeliveryFee (useDeliveryFee.ts:57)
at UnitPage (UnitPage.tsx:262)
```

O React proíbe chamar hooks após um `return` condicional (Regra dos Hooks). No `UnitPage.tsx`, o fluxo atual é:

```
linha 156 → if (orgLoading) return <Skeleton />   ← early return
linha 170 → if (!org) return null                  ← early return

... 40 linhas depois ...

linha 211 → const { fee } = useDeliveryFee(...)   ← HOOK CHAMADO DEPOIS DO RETURN → CRASH
```

Na primeira renderização, `orgLoading` é `true`, então o componente retorna o skeleton antes de chegar no `useDeliveryFee`. Quando os dados carregam e `orgLoading` vira `false`, o React tenta re-renderizar — mas agora o componente chega até o `useDeliveryFee` e encontra mais hooks do que na renderização anterior, causando o crash e tela branca.

## Solução

Mover a chamada do `useDeliveryFee` para **antes** dos returns condicionais, junto com todos os outros hooks no topo do componente. O hook já aceita `enabled = false` para ficar inativo enquanto os dados não estão prontos — basta passar `enabled` levando em conta que `org` pode ser `null`.

## Arquivo afetado

Somente `src/pages/UnitPage.tsx`:

- Mover o bloco `useDeliveryFee` (linhas ~211-216) para o topo do componente, logo abaixo dos outros hooks (linha ~55)
- Ajustar o `enabled` para incluir `!!org` na condição, garantindo que o hook só calcule quando a organização foi carregada

```typescript
// ANTES (posição errada — após early returns):
if (orgLoading) return <Skeleton />;
if (!org) return null;
// ...
const { fee } = useDeliveryFee(address, totalPrice, org, orderType === "Entrega" && checkoutOpen);

// DEPOIS (posição correta — antes de qualquer return):
const { fee } = useDeliveryFee(
  address,
  totalPrice,
  org ?? null,
  !!org && orderType === "Entrega" && checkoutOpen  // ← adiciona !!org
);
// ...
if (orgLoading) return <Skeleton />;
if (!org) return null;
```

Nenhuma mudança de lógica ou UI — só reposicionamento do hook para respeitar a Regra dos Hooks do React.
