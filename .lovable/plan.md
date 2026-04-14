

## Ocultar itens indisponíveis da vitrine pública

### Problema
Itens com `available = false` aparecem na loja pública (UnitPage) com label "Indisponível" e opacidade reduzida, em vez de serem completamente ocultos. O mesmo ocorre com itens cujo estoque está zerado.

### Solução
Adicionar filtro `i.available === true` no `filteredMenuItems` do `UnitPage.tsx`, antes dos filtros de dia e busca. Isso remove completamente os itens desativados da vitrine.

### Arquivo alterado
**`src/pages/UnitPage.tsx`**
1. No `filteredMenuItems` (linha ~792), adicionar `if (!i.available) return false;` como primeira verificação
2. Remover o código de renderização do label "Indisponível" e a lógica de opacidade (`opacity-60`), já que itens desativados nunca serão exibidos
3. Remover o guard `if (item.available)` no botão de adicionar ao carrinho (não será mais necessário)

### Verificação
- `available === false` → item oculto
- `available_days` não inclui hoje → item oculto
- `paused_categories` → categoria inteira oculta (já funciona)
- `available === true` + dia correto + categoria ativa → item visível

