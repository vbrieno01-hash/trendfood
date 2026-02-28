

## Plano: Adicionar botão de excluir loja no StoreCard do painel admin

### Implementação

**Arquivo: `src/pages/AdminPage.tsx`**

1. Importar `Trash2` do lucide-react (já importado no projeto) e o componente `DeleteUnitDialog`
2. Adicionar estado `deleteTarget` no `AdminContent` para controlar qual loja está sendo excluída
3. No `StoreCard`, adicionar um botão de lixeira ao lado do link "Ver loja" no rodapé do card
4. Renderizar o `DeleteUnitDialog` no `AdminContent`, passando a org selecionada
5. Após exclusão, recarregar a lista de lojas removendo a org deletada do state local

### Detalhes
- O `DeleteUnitDialog` já existe e faz a limpeza em cascata (order_items, orders, menu_items, tables, etc.)
- O botão terá estilo discreto (muted) com hover vermelho para indicar ação destrutiva
- Posicionado no rodapé do card, ao lado de "Ver loja →"

