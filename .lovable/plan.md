

# Estoque Inteligente — Insumos vinculados a produtos com baixa automática

## Visão geral
Criar sistema de estoque onde cada produto do cardápio pode ter ingredientes (insumos) vinculados. Quando um pagamento é confirmado (`paid = true`), o sistema subtrai automaticamente os insumos e desativa produtos sem estoque.

## Banco de dados (2 tabelas novas + 1 trigger + 1 function)

### Tabela `stock_items` (insumos)
- `id`, `organization_id`, `name`, `unit` (ex: "kg", "un", "L"), `quantity` (estoque atual), `min_quantity` (alerta), `created_at`
- RLS: owner da org pode CRUD, select público (para o trigger funcionar)

### Tabela `menu_item_ingredients` (vínculo produto ↔ insumo)
- `id`, `menu_item_id`, `stock_item_id`, `quantity_used` (quanto consome por unidade vendida)
- RLS: owner da org pode CRUD

### Function `deduct_stock_and_disable()`
- Trigger `AFTER UPDATE` na tabela `orders` quando `NEW.paid = true AND OLD.paid = false`
- Para cada `order_item` do pedido:
  - Busca ingredientes vinculados em `menu_item_ingredients`
  - Subtrai `quantity_used * order_item.quantity` do `stock_items.quantity`
  - Se algum `stock_item.quantity <= 0`, busca todos os `menu_items` que usam esse insumo e seta `available = false`

## Frontend

### Nova aba "Estoque" no Dashboard
- Lista de insumos com nome, unidade, quantidade atual, quantidade mínima
- CRUD de insumos (adicionar, editar, remover)
- No formulário de edição de item do cardápio (MenuTab), adicionar seção "Ingredientes" para vincular insumos e definir quantidade consumida por unidade

### Hook `useStockItems.ts`
- `useStockItems(orgId)` — lista insumos
- `useAddStockItem`, `useUpdateStockItem`, `useDeleteStockItem`
- `useMenuItemIngredients(menuItemId)` — ingredientes vinculados a um item

### Alterações no `DashboardPage.tsx`
- Adicionar tab "Estoque" com ícone `Package` no sidebar

## Fluxo automático (sem alteração no frontend de pedidos)
A trigger no banco cuida de tudo: quando `paid` muda para `true` (seja pelo garçom, PIX, ou webhook MP), a baixa e desativação acontecem automaticamente no PostgreSQL.

