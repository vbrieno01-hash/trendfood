

## Problema

Existem 16 adicionais globais e dezenas de produtos. Excluir um por um de cada produto é inviável -- por exemplo, "Água" tem só 3 exclusões de 16. Precisa de uma forma rápida de dizer "este produto não tem adicionais".

## Solução: Toggle "Sem adicionais" por produto

Adicionar um campo `hide_global_addons` (boolean) na tabela `menu_items`. Quando ativado, o produto não mostra nenhum adicional global no cardápio do cliente.

### Alterações

1. **Migração SQL**: adicionar coluna `hide_global_addons boolean NOT NULL DEFAULT false` na tabela `menu_items`

2. **Painel do lojista (MenuTab.tsx)**: na seção de adicionais do modal de edição de produto, adicionar um Switch "Ocultar todos os adicionais fixos deste produto". Quando ligado, esconde os toggles individuais de exclusão (não precisa mais)

3. **Cardápio do cliente (ItemDetailDrawer.tsx)**: antes de montar a lista de adicionais, checar `item.hide_global_addons`. Se `true`, pular todos os adicionais globais (mostrar apenas os item-específicos, se houver)

4. **Tipo MenuItem**: adicionar o campo `hide_global_addons` no tipo

### Resultado
O lojista pode abrir cada produto que não precisa de adicionais (Bebidas, etc.) e ligar um único switch, em vez de desmarcar 16 adicionais um por um.

