

## Edição de Pedidos — Adicionar/Remover Itens

### Problema
Quando um pedido sai errado ou faltando algo, não há como editá-lo. O dono precisa cancelar e refazer do zero.

### Solução
Adicionar um botão "Editar" nos pedidos (pending/preparing) que abre um drawer/dialog onde o dono pode:
- Ver os itens atuais do pedido
- Remover itens existentes
- Adicionar novos itens do cardápio
- Salvar as alterações

### Mudanças

**1. Hook `useOrders.ts` — novo mutation `useEditOrderItems`**
- Recebe `orderId` + lista atualizada de itens
- Deleta os `order_items` atuais do pedido
- Insere os novos `order_items`
- Invalida queries de pedidos

**2. Novo componente `src/components/dashboard/EditOrderDialog.tsx`**
- Dialog/Drawer que recebe o pedido e o `orgId`
- Lista os itens atuais com botões +/- e lixeira
- Campo de busca para adicionar novos itens do cardápio (usa `useMenuItems`)
- Botão "Salvar" que chama `useEditOrderItems`
- Mostra o novo total atualizado

**3. `KitchenTab.tsx` — botão "Editar" nos cards de pedido**
- Adicionar ícone de edição (lápis) ao lado dos botões existentes (Imprimir, Aceitar, etc.)
- Visível apenas em pedidos `pending` e `preparing`
- Abre o `EditOrderDialog`

### Fluxo
1. Dono vê pedido errado na cozinha
2. Clica no ícone de edição ✏️
3. Dialog abre com itens atuais
4. Remove o que está errado, adiciona o que falta
5. Salva → itens atualizados no banco → cozinha atualiza em tempo real

