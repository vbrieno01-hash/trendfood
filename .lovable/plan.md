

# Composição do Produto no formulário de criação

## Problema
A `IngredientsSection` só aparece ao editar porque precisa de um `menuItemId` para salvar no banco. Ao criar, o item ainda não existe.

## Solução
Usar uma abordagem de "ingredientes pendentes" durante a criação:

### 1. Criar componente `PendingIngredientsSection`
- Mesma UI da `IngredientsSection`, mas armazena os vínculos em estado local (array de `{ stock_item_id, quantity_used }`) em vez de salvar no banco
- Sem chamadas ao banco — apenas lista local com adicionar/remover

### 2. Estado `pendingIngredients` no `MenuTab`
- Novo estado `useState<Array<{ stock_item_id: string; quantity_used: number }>>([])` 
- Limpo ao fechar modal e ao abrir modal de edição

### 3. Alterar `handleSubmit` para salvar ingredientes após criação
- Após `addMutation.mutateAsync(payload)` retornar o novo item (com `id`), iterar sobre `pendingIngredients` e chamar `addIngredient.mutate()` para cada um
- O hook `useAddMenuItem` já retorna `data` com o `id` do item criado

### 4. Renderização condicional no modal
- Se `editItem` existe → mostra `IngredientsSection` (atual, com banco)
- Se não (criação) → mostra `PendingIngredientsSection` (com estado local)
- Ambas com título "Composição do Produto" e mesma aparência visual

### Arquivos alterados
- `src/components/dashboard/MenuTab.tsx` — único arquivo modificado

