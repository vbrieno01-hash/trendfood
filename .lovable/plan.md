

## Correção: Fechar todos os grupos ao navegar para "Home"

**Problema:** O `useEffect` na linha 596-601 só fecha/abre grupos quando `activeTab` pertence a algum grupo. Como "home" não está em nenhum grupo, nada acontece e o grupo anterior continua aberto.

**Solução:** Adicionar um `else` no `useEffect` para fechar todos os grupos quando a aba ativa não pertence a nenhum grupo (ex: "home"):

```tsx
useEffect(() => {
  const parentGroup = sidebarGroups.find(g => g.items.some(i => i.key === activeTab));
  if (parentGroup) {
    setOpenGroups({ [parentGroup.id]: true });
  } else {
    setOpenGroups({});
  }
}, [activeTab]);
```

**Arquivo:** `src/pages/DashboardPage.tsx`, linhas 596-601. Alteração de 1 linha (adicionar o `else`).

