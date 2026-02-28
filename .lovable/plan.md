

# Trava de Estoque no Painel do Garcom e Mesas

## Contexto
O `TableOrderPage.tsx` renderiza o cardapio filtrando apenas `item.available`, mas nao verifica o estoque real dos ingredientes. O seletor de quantidade (`adjust`) nao tem limite superior baseado em estoque.

## Abordagem

### 1. Criar hook `useMenuItemStock` 
Novo arquivo `src/hooks/useMenuItemStock.ts`:
- Busca todos os `menu_item_ingredients` com join em `stock_items` para a org
- Calcula para cada `menu_item_id` o maximo disponivel: `Math.floor(min(stock.quantity / ingredient.quantity_used))`
- Itens sem ingredientes vinculados retornam `Infinity` (sem limite)
- Retorna um `Map<string, number>` de `menuItemId -> maxAvailable`

### 2. Alterar `TableOrderPage.tsx`
- Importar `useMenuItemStock`
- Filtrar itens: ocultar produtos cujo `maxAvailable === 0`
- No nome do produto, mostrar `"Coca-Cola (8 unid.)"` quando tem ingredientes vinculados
- Na funcao `adjust`: limitar quantidade ao `maxAvailable` considerando TODOS os itens no carrinho que usam o mesmo menu_item_id (soma de todas as pessoas)
- Desabilitar botao `+` quando atingir o limite

### 3. Alterar `WaiterPage.tsx`
- Esse arquivo nao tem seletor de cardapio — ele so exibe pedidos prontos/pagamento. O painel do garcom que faz pedidos e o `TableOrderPage`. Nenhuma alteracao necessaria aqui.

### Arquivos
- **Criar**: `src/hooks/useMenuItemStock.ts`
- **Editar**: `src/pages/TableOrderPage.tsx`

