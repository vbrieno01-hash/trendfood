

## Plano: Ajustar cores da tabela comparativa para a marca TrendFood

### Alterações em `src/components/landing/ComparisonSection.tsx`

**Coluna TrendFood — trocar verde para laranja da marca:**

1. **Desktop — ícone Check** (linha 88): `text-green-600` → `text-orange-500`
2. **Desktop — fundo da coluna** (linha 87): `bg-green-500/5` → `bg-orange-500/5`
3. **Desktop — badges** (linha 93): `bg-green-100 text-green-700 border-green-200` → `bg-orange-100 text-orange-700 border-orange-200`
4. **Mobile — ícone Check** (linha 119): `text-green-600` → `text-orange-500`
5. **Mobile — fundo da coluna** (linha 117): `bg-green-500/5` → `bg-orange-500/5`
6. **Mobile — badges** (linha 124): `bg-green-100 text-green-700 border-green-200` → `bg-orange-100 text-orange-700 border-orange-200`

**Coluna Marketplaces** — sem alteração, já usa `text-destructive` (vermelho) e `bg-destructive/5`.

**Responsividade** — já está implementada com layout desktop (grid) e mobile (cards empilhados). Sem alteração necessária.

