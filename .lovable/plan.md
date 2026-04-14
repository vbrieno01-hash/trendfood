

## Botão rápido "Mover categoria" no card do item

### O que será feito
Adicionar um botão com ícone `ArrowUpDown` (já importado) na linha de ações de cada item do cardápio. Ao clicar, abre um pequeno popover/select com a lista de categorias disponíveis. Ao selecionar uma categoria diferente, o item é movido instantaneamente sem abrir o formulário completo.

### Mudanças em `src/components/dashboard/MenuTab.tsx`

1. **Importar `Popover`/`PopoverTrigger`/`PopoverContent`** de `@/components/ui/popover`
2. **Novo estado**: `moveCatTarget` — guarda o `item.id` cujo popover está aberto (ou `null`)
3. **Botão na row de ações** (entre o botão Editar e o Duplicar, linha ~1053): ícone `ArrowUpDown`, abre popover com lista de categorias
4. **Popover com lista de categorias**: mostra todas as categorias do `grouped` + as do `CATEGORIES`. Ao clicar numa categoria diferente da atual, chama `updateMutation.mutate` com a nova categoria e fecha o popover
5. A categoria atual fica destacada (bold/check) na lista

### Resultado
- Um clique no ícone → popover com categorias → seleciona → item movido
- Sem abrir modal de edição completa

