

## Plano: Reordenar categorias do cardápio

### Problema
As categorias seguem uma ordem fixa hardcoded (CATEGORIES array) + custom categories em ordem alfabética. Não há como o lojista reorganizar a ordem que aparece no site público.

### Solução
Salvar a ordem das categorias por loja no banco de dados (`organizations.category_order` como JSONB array de strings) e usar essa ordem em todos os lugares que agrupam por categoria.

### Mudanças

| # | Local | O que |
|---|-------|-------|
| 1 | **Migração SQL** | Adicionar coluna `category_order jsonb default null` na tabela `organizations` |
| 2 | **`src/components/dashboard/MenuTab.tsx`** | Adicionar botões ↑ ↓ ao lado de cada cabeçalho de categoria para mover para cima/baixo. Salvar a nova ordem no `organizations.category_order` |
| 3 | **`src/hooks/useMenuItems.ts`** | Exportar função `buildCategoryGroups(items, customOrder?)` que usa `category_order` da org quando disponível, senão fallback para CATEGORIES |
| 4 | **`src/pages/UnitPage.tsx`** | Usar `category_order` da org (já disponível via query de org) no `buildGroups` |
| 5 | **`src/pages/TableOrderPage.tsx`** | Usar `category_order` da org no agrupamento |

### Como funciona

1. No dashboard, cada grupo de categoria ganha botões `ChevronUp` / `ChevronDown`
2. Ao clicar, a lista de categorias é reordenada e salva em `organizations.category_order` (array JSON de strings, ex: `["Bebidas", "Lanches", "Sobremesas"]`)
3. Em todos os locais (UnitPage, TableOrderPage, MenuTab), a ordem de exibição respeita esse array
4. Se `category_order` for null, mantém a ordem padrão atual (CATEGORIES + custom alfabético)

### Resultado
- 1 migração SQL (nova coluna)
- 4 arquivos editados
- Lojista controla a ordem das categorias no site público

