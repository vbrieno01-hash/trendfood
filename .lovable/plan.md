

## Plano: Corrigir erro de hooks no UnitPage (página crashando)

### Problema
A página `/unidade/:slug` está crashando com o erro **"Rendered more hooks than during the previous render"**. Isso acontece porque o `useState(_tick)` e o `useEffect` do auto-refresh foram adicionados nas linhas 296-300, **depois** dos early returns condicionais nas linhas 268 (`if (orgLoading)`) e 282 (`if (!org)`).

React exige que todos os hooks sejam chamados **antes** de qualquer `return` condicional e sempre na mesma ordem.

### Correção

**`src/pages/UnitPage.tsx`** (único arquivo)

1. **Mover** o `useState(0)` do `_tick` e o `useEffect` do `setInterval` para **antes** da linha 268 (antes dos early returns), junto com os outros hooks no topo do componente (por exemplo, após a linha 159, junto dos outros `useState`).

2. Sem outras alterações — apenas reposicionar os 6 linhas (296-300) para o bloco de hooks no topo.

### Resultado
- A página `/unidade/:slug` volta a funcionar sem crash
- O auto-refresh de 60s continua funcionando normalmente
- O banner "Fechada" aparece automaticamente quando o horário encerra

