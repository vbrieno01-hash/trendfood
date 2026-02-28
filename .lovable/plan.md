

## Plano: CRUD de Adicionais no Painel + Integração Completa

### Situação Atual
- A tabela `menu_item_addons` **já existe** no banco com RLS configurado.
- O hook `useMenuItemAddons` **já existe** (leitura pública).
- O `ItemDetailDrawer` (cardápio do cliente) **já exibe** adicionais com checkboxes e preço dinâmico.
- O carrinho e WhatsApp **já incluem** adicionais no formato correto.
- **Falta**: CRUD de adicionais no painel do lojista (`MenuTab.tsx`) e exibição no KDS (cozinha).

### Alterações

#### 1. Criar hooks CRUD para adicionais
**Novo arquivo**: `src/hooks/useMenuItemAddonsCrud.ts`
- `useMenuItemAddons(menuItemId)` — listar todos (incluindo inativos) para o painel admin
- `useAddMenuItemAddon()` — inserir addon
- `useUpdateMenuItemAddon()` — atualizar nome/preço/disponibilidade
- `useDeleteMenuItemAddon()` — remover addon

#### 2. Adicionar seção "Adicionais" no modal de edição de produto (`MenuTab.tsx`)
- Inserir após a seção "Composição do Produto" (linha ~824) um novo componente `AddonsSection`
- Em modo **edição**: CRUD direto no banco (como `IngredientsSection`)
- Em modo **criação**: estado local `pendingAddons[]`, salvar após `addMutation` retornar o ID
- Cada addon: campo nome, campo preço (CurrencyInput em centavos), switch ativo/inativo, botão remover
- Botão "+ Adicionar adicional" para criar novos

#### 3. Exibir adicionais no KDS (KitchenPage + KitchenTab)
- O campo `name` do `order_items` já contém `"Hambúrguer (+ Bacon, + Queijo)"` — já aparece no KDS.
- Verificar e garantir que a exibição está legível nas telas de cozinha (nenhuma alteração deve ser necessária pois os nomes já incluem os adicionais).

#### 4. Integração com Mercado Pago
- O valor total do pedido já soma adicionais corretamente (`item.price` no carrinho já inclui base + addons).
- Os `order_items` salvos no banco já contêm o preço com adicionais somados.
- Nenhuma alteração necessária no fluxo de pagamento.

### Arquivos alterados
1. **Novo**: `src/hooks/useMenuItemAddonsCrud.ts`
2. **Editado**: `src/components/dashboard/MenuTab.tsx` — adicionar `AddonsSection` e `PendingAddonsSection`

### Detalhes técnicos
- O CRUD usa a tabela existente `menu_item_addons` com `price_cents` (inteiro em centavos).
- RLS já configurado: leitura pública, gestão por owner da org.
- Nenhuma migration necessária — a tabela já tem a estrutura correta.
- O KDS já funciona porque `order_items.name` inclui os adicionais inline.

