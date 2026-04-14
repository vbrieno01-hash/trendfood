

## Corrigir layout dos pedidos dentro das colunas

### Problema
Os cards de pedidos dentro do KitchenTab usam `grid md:grid-cols-2`, tentando mostrar 2 cards lado a lado. Quando o KitchenTab está dentro de uma coluna de 1/3 da tela, não há espaço suficiente e os pedidos ficam espremidos/feios.

### Solução
Quando o KitchenTab estiver no modo `embedded` (dentro do OperationsTab), forçar os cards a ficarem empilhados verticalmente (1 coluna), removendo o `md:grid-cols-2`.

### Alterações

**`src/components/dashboard/KitchenTab.tsx`**
- Nas duas grids de pedidos (pendentes ~linha 477 e preparando ~linha 626), trocar de:
  - `grid gap-4 md:grid-cols-2` 
  - para `grid gap-4` quando `embedded === true` (sem grid-cols-2)
  - manter `grid gap-4 md:grid-cols-2` quando não embedded (tela cheia)

Mesma verificação será feita no **WaiterTab.tsx** caso também use grid multi-coluna nos cards.

### Resultado
Os pedidos ficam empilhados um embaixo do outro dentro de cada painel, ocupando toda a largura disponível da coluna.

