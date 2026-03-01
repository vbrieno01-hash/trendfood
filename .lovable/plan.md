

## Plano: Toggle "Ocultar adicionais fixos" no modal de criação de produto

### Problema
O toggle "Ocultar todos os adicionais fixos deste produto" só aparece quando **editando** um item existente (dentro do `AddonsSection`). Ao **criar** um novo item, o `PendingAddonsSection` não tem esse toggle. O usuário quer definir isso já na criação.

### Alterações

1. **Adicionar estado `pendingHideGlobalAddons`** no componente principal do `MenuTab` (junto com `pendingAddons`, `pendingIngredients`), resetado em `openCreate` e `closeModal`.

2. **Adicionar o Switch no `PendingAddonsSection`** com a mesma aparência do existente no `AddonsSection` -- "Ocultar todos os adicionais fixos deste produto".

3. **No `handleSubmit`, ao criar**: incluir `hide_global_addons` no payload. Como o `useAddMenuItem` não passa esse campo hoje, ajustar a mutation ou fazer um update logo após a criação com o valor.

4. **Ajustar `useAddMenuItem`** para aceitar `hide_global_addons` no insert.

### Componentes afetados
- `src/components/dashboard/MenuTab.tsx` -- estado + PendingAddonsSection + handleSubmit
- `src/hooks/useMenuItems.ts` -- `useAddMenuItem` para incluir `hide_global_addons`

