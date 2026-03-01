

## Diagnóstico

O erro é **React error #310** ("Too many re-renders") acontecendo no `DashboardPage` quando usuários fazem login pelo celular Android. O erro é capturado pelo `ErrorBoundary` que exibe a tela "Algo deu errado".

### Causa raiz

Encontrei dois problemas no `DashboardPage.tsx` que podem causar loops de re-render:

1. **`useEffect` na linha 598-605** — chama `setOpenGroups({ operacional: true })` a cada render, criando um novo objeto mesmo quando o valor é idêntico ao estado anterior. O React faz comparação por referência, então considera que o estado mudou e dispara um novo render. Em dispositivos mais lentos (Android), isso pode se acumular e causar o erro #310.

2. **`sidebarGroups` (linha 556)** — array criado dentro do render body sem memoização, sendo recriado a cada render. É referenciado pelo `useEffect` acima.

3. **`usePlanLimits`** — retorna um novo objeto `canAccess` (função) a cada render, potencialmente causando re-renders em cascata nos componentes filhos.

### Solução

**Arquivo: `src/pages/DashboardPage.tsx`**

1. **Memoizar `sidebarGroups`** com `useMemo` para evitar recriação desnecessária
2. **Corrigir o `useEffect` de `openGroups`** para evitar criar novo objeto quando o valor é o mesmo — usar comparação funcional em `setOpenGroups`
3. **Memoizar `lockedFeatures`** com `useMemo`

```typescript
// Antes (linha 598-605):
useEffect(() => {
  const parentGroup = sidebarGroups.find(g => g.items.some(i => i.key === activeTab));
  if (parentGroup) {
    setOpenGroups({ [parentGroup.id]: true });
  } else {
    setOpenGroups({});
  }
}, [activeTab]);

// Depois:
useEffect(() => {
  const parentGroup = sidebarGroups.find(g => g.items.some(i => i.key === activeTab));
  const targetId = parentGroup?.id;
  setOpenGroups(prev => {
    const keys = Object.keys(prev);
    if (targetId && keys.length === 1 && prev[targetId]) return prev; // mesma referência
    if (!targetId && keys.length === 0) return prev;
    return targetId ? { [targetId]: true } : {};
  });
}, [activeTab]);
```

**Arquivo: `src/hooks/usePlanLimits.ts`**

4. **Envolver o retorno com `useMemo`** para estabilizar a referência do objeto retornado

Essas mudanças eliminam os re-renders desnecessários que causam o loop no Android.

