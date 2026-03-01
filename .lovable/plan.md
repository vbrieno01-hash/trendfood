

## Plano: Corrigir Legibilidade dos Números no Dark Mode

### Problema
Os cards de estatísticas e status no `HomeTab.tsx` usam cores hardcoded de light mode (`bg-green-50`, `text-green-700`, `border-green-200`, `bg-amber-50`, etc.) sem variantes dark. No modo escuro, o fundo fica quase invisível e os textos somem.

### Correções em `src/components/dashboard/HomeTab.tsx`

**1. Stats cards (linhas 147-180)** — Adicionar variantes dark:
- `bg-green-50` → `bg-green-50 dark:bg-green-950/30`
- `border-green-200` → `border-green-200 dark:border-green-800`
- `text-green-600` → `text-green-600 dark:text-green-400`
- Mesmo padrão para blue, amber, purple

**2. Subscription status badge (linhas 213-220)** — Adicionar variantes dark:
- `bg-green-50 text-green-700 border-green-200` → adicionar `dark:bg-green-950/30 dark:text-green-400 dark:border-green-800`
- Mesmo para red e amber

**3. Pause toggle (linha 262)** — Adicionar dark variants:
- `border-amber-300 bg-amber-50` → adicionar `dark:bg-amber-950/30 dark:border-amber-700`

### Arquivo alterado
- `src/components/dashboard/HomeTab.tsx`

