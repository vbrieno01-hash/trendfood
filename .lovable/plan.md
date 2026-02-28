

# Vincular Ingredientes aos Produtos do Cardápio

## Estado atual
- Tabelas `stock_items` e `menu_item_ingredients` ja existem no banco
- Trigger `trg_deduct_stock_on_paid` ja esta ativo: quando `paid` muda para `true`, subtrai insumos e desativa produtos sem estoque
- Aba "Estoque" com CRUD de insumos ja funciona
- Hook `useStockItems.ts` com `useMenuItemIngredients`, `useAddMenuItemIngredient`, `useRemoveMenuItemIngredient` ja existe

## O que falta
A unica peca que falta e a **interface no formulario de edicao de item do cardapio** (MenuTab) para vincular insumos aos produtos. Sem isso, o trigger nao tem ingredientes para subtrair.

## Implementacao

### 1. Adicionar secao "Ingredientes" no modal de editar/criar item (`MenuTab.tsx`)
- Abaixo dos campos existentes (nome, preco, categoria, etc.), adicionar um bloco "Ingredientes vinculados"
- Select para escolher um insumo da lista (via `useStockItems`)
- Input numerico para `quantity_used` (quanto consome por unidade vendida)
- Botao "Vincular"
- Lista dos ingredientes ja vinculados com botao de remover
- So aparece quando editando um item existente (nao ao criar, pois o item ainda nao tem ID)

### 2. Importar hooks no MenuTab
- `useStockItems`, `useMenuItemIngredients`, `useAddMenuItemIngredient`, `useRemoveMenuItemIngredient`

### 3. Fluxo completo apos implementacao
1. Lojista cria insumos na aba Estoque (ex: "Pao", 50 un)
2. Lojista edita um produto no Cardapio e vincula ingredientes (ex: "Pao", 1 un por hamburguer)
3. Cliente faz pedido → garcom confirma pagamento (ou PIX/MP webhook seta `paid = true`)
4. Trigger PostgreSQL subtrai automaticamente os insumos
5. Se estoque chega a zero, produto e desativado automaticamente

