

## Sidebar sempre aberta e rolável

### Problema
Os donos de loja têm dificuldade em encontrar as opções porque os grupos (OPERACIONAL, LOGÍSTICA, etc.) ficam colapsados em acordeão — precisam clicar para abrir e só um grupo abre por vez.

### Solução
Remover o comportamento de acordeão (Collapsible) e mostrar **todos os grupos sempre expandidos**. A sidebar já tem `overflow-y-auto`, então basta rolar para ver tudo.

### Mudanças em `src/pages/DashboardPage.tsx`

1. **Remover estado `openGroups`** e o `useEffect` que sincroniza grupo aberto com aba ativa (linhas 92, 572-581)
2. **Substituir `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`** por divs simples — cada grupo mostra título + todos os itens sempre visíveis
3. Manter os títulos dos grupos (⚡ OPERACIONAL, 📦 LOGÍSTICA, etc.) como headers visuais não-clicáveis
4. Remover import de `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` e `ChevronDown` se não usados em outro lugar

### Resultado
- Todas as opções visíveis de imediato ao abrir o sidebar
- Rolagem natural para encontrar qualquer item
- Menos cliques para navegar

