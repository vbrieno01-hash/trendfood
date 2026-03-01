

## Situação

Os adicionais agora são **globais** -- aparecem em todos os produtos. O problema é que não existe mecanismo para **excluir** um adicional global de um produto específico. Por exemplo, se "Bacon" é global mas não faz sentido para "Suco de Laranja", hoje não dá para remover só desse item.

Existem duas abordagens possíveis:

### Opção A: Tabela de exclusões por produto
Criar uma tabela `global_addon_exclusions(menu_item_id, global_addon_id)`. No `ItemDetailDrawer`, ao montar a lista de adicionais, filtrar os que estão na tabela de exclusão. No painel do lojista, ao editar um produto, mostrar os adicionais globais com um toggle para excluir daquele item.

### Opção B: Gerenciar direto na seção de Adicionais Fixos
A seção "Adicionais fixos" (`GlobalAddonsSection`) já existe no painel e já tem botão de deletar (lixeira) e toggle on/off. Para remover um adicional de **todos** os produtos, basta deletar ou desativar ali. Se o objetivo é remover de **todos**, já funciona.

## Proposta

A abordagem mais provável do que o usuário quer: **remover certos adicionais globais que não deveriam ter sido migrados**, ou **excluir adicionais globais de produtos específicos**.

Vou implementar a **Opção A** -- exclusão por produto:

1. **Criar tabela `global_addon_exclusions`** com colunas `menu_item_id` e `global_addon_id`, RLS permitindo owner gerenciar e select público
2. **No `AddonsSection` (edição de produto no painel)**: mostrar os adicionais globais herdados com um botão para excluir daquele produto específico (toggle de exclusão)
3. **No `ItemDetailDrawer` (cardápio do cliente)**: ao montar a lista de adicionais, filtrar removendo os que estão na tabela de exclusões para aquele `menu_item_id`

### Detalhes técnicos

**Migração SQL:**
```sql
CREATE TABLE global_addon_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL,
  global_addon_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, global_addon_id)
);
ALTER TABLE global_addon_exclusions ENABLE ROW LEVEL SECURITY;
-- RLS: owner manage, public select
```

**Hook novo:** `useGlobalAddonExclusions(menuItemId)` -- busca exclusões para um item

**Alterações em componentes:**
- `AddonsSection` no `MenuTab.tsx`: mostrar adicionais globais com opção de excluir do produto
- `ItemDetailDrawer.tsx`: filtrar globais excluídos
- `useGlobalAddons.ts` ou novo hook para buscar exclusões

