

## Diagnóstico Real

O erro persiste porque a correção anterior não atacou a causa real. O problema é uma **violação das regras de hooks do React** no `DashboardPage.tsx`.

### O que está acontecendo

O componente tem **3 retornos antecipados (early returns)** nas linhas 479, 491 e 517:
- Linha 479: `if (loading || !user)` → retorna skeleton
- Linha 491: `if (!organization)` → retorna "nenhuma loja"
- Linha 517: `if (subscriptionStatus === "inactive")` → retorna tela bloqueada

**Depois** desses returns, existem hooks nas linhas 546, 556 e 598:
- `useMemo` para `lockedFeatures` (linha 546)
- `useMemo` para `sidebarGroups` (linha 556)
- `useEffect` para `openGroups` (linha 598)

Isso viola a regra fundamental do React: hooks devem ser chamados na mesma ordem em todo render. Quando `loading` é `true`, o componente retorna na linha 479 e esses 3 hooks nunca executam. Quando o auth completa e `loading` vira `false`, os hooks aparecem pela primeira vez — o React detecta a inconsistência e crasha com error #310.

Em dispositivos Android mais lentos, o estado `loading` muda mais devagar, tornando o bug mais visível.

### Solução

Mover os 3 hooks (`useMemo` de `lockedFeatures`, `useMemo` de `sidebarGroups`, e `useEffect` de `openGroups`) para **antes** de todos os early returns (antes da linha 479). Os hooks podem receber valores fallback quando `organization` é null, já que os early returns impedirão que o resultado seja usado de qualquer forma.

**Arquivo: `src/pages/DashboardPage.tsx`**

1. Mover `lockedFeatures` (linhas 546-554) para antes da linha 479
2. Mover `sidebarGroups` (linhas 556-595) para antes da linha 479
3. Mover `useEffect` de `openGroups` (linhas 598-607) para antes da linha 479

Todos usam `planLimits` que já está declarado na linha 63, então não há problema de dependência.

