

## Plano: Remover botão "Início" da página do cliente

### Problema
O botão "← Início" no topo da página da loja (`/unidade/:slug`) leva o cliente de volta à landing page do TrendFood, fazendo com que percam o pedido em andamento.

### Correção
**`src/pages/UnitPage.tsx`** — remover o `<Link to="/">` com o texto "Início" (linhas 635-638). Manter o restante do header intacto.

### Arquivos alterados
- `src/pages/UnitPage.tsx` (remover 4 linhas)

