

## Plano: Adicionais Globais + Adicionais por Item

### Situação atual
Hoje cada adicional é vinculado a um produto específico (`menu_item_id`). Se você tem 20 lanches e quer oferecer "Bacon extra" em todos, precisa cadastrar 20 vezes.

### Solução proposta
Criar um sistema de **adicionais globais** (fixos) que aparecem em todos os produtos da loja, combinados com os adicionais específicos de cada item.

### Alterações

**1. Nova tabela `global_addons`**
- `id`, `organization_id`, `name`, `price_cents`, `available`, `sort_order`, `created_at`
- RLS: owner pode CRUD, público pode ler (igual `menu_item_addons`)

**2. Seção "Adicionais Fixos" no MenuTab**
- Um card/seção acima da lista de produtos (ou como accordion) onde o lojista cadastra adicionais que valem para todos os itens
- CRUD igual ao dos adicionais por item (nome, preço, ativar/desativar, excluir)

**3. Cardápio do cliente (ItemDetailDrawer)**
- Buscar adicionais globais da org + adicionais específicos do item
- Mostrar os globais primeiro, depois os específicos (sem duplicar)

**4. Hooks novos**
- `useGlobalAddons(orgId)` — lista globais disponíveis (para o cliente)
- `useGlobalAddonsCrud` — CRUD completo (para o lojista)

### Arquivos alterados/criados
- **Migration SQL** — criar tabela `global_addons` + RLS
- `src/hooks/useGlobalAddons.ts` — novo hook de leitura
- `src/hooks/useGlobalAddonsCrud.ts` — novo hook CRUD
- `src/components/dashboard/MenuTab.tsx` — seção de adicionais globais
- `src/components/unit/ItemDetailDrawer.tsx` — merge dos adicionais globais + por item

### Fluxo do lojista
1. Vai em Cardápio → vê seção "Adicionais fixos (todos os produtos)"
2. Cadastra "Bacon extra R$5", "Queijo cheddar R$3", etc.
3. Se um produto específico precisa de algo a mais, abre o produto e adiciona lá

### Fluxo do cliente
1. Abre um produto no cardápio
2. Vê todos os adicionais globais + os específicos daquele item
3. Seleciona o que quiser

