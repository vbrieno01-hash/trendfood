

## Accordion único na sidebar

### O que muda
Atualmente cada seção (OPERACIONAL, LOGÍSTICA, etc.) é um `Collapsible` independente e todas podem ficar abertas ao mesmo tempo. Vou alterar o `onOpenChange` para que ao abrir uma seção, todas as outras fechem automaticamente.

### Alteração técnica

**Arquivo:** `src/pages/DashboardPage.tsx`

1. **Linha 744** — Alterar o `onOpenChange` do `Collapsible` para fechar todos os outros grupos ao abrir um novo:

```tsx
// De:
onOpenChange={(val) => setOpenGroups((prev) => ({ ...prev, [group.id]: val }))}

// Para:
onOpenChange={(val) => setOpenGroups(val ? { [group.id]: true } : {})}
```

Quando `val` é `true` (abrindo), o state fica apenas com aquele grupo aberto. Quando `val` é `false` (fechando), limpa tudo.

2. **Linha 743** — Remover o `|| hasActiveTab` do `open` para permitir que o grupo feche mesmo contendo a aba ativa:

```tsx
// De:
open={isGroupOpen || hasActiveTab}

// Para:
open={isGroupOpen}
```

3. **Manter a abertura automática ao trocar de aba** — adicionar um `useEffect` que abre o grupo correto quando `activeTab` muda (para que ao clicar num item, o grupo dele se mantenha aberto):

```tsx
useEffect(() => {
  const parentGroup = sidebarGroups.find(g => g.items.some(i => i.key === activeTab));
  if (parentGroup) {
    setOpenGroups({ [parentGroup.id]: true });
  }
}, [activeTab]);
```

Isso garante o comportamento de accordion único: só uma seção aberta por vez, e ao navegar o grupo correto abre automaticamente.

