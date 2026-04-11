

## Pausar Categorias Específicas

### Conceito
Adicionar uma coluna `paused_categories` (JSONB, array de strings) na tabela `organizations`. Categorias listadas nesse array ficam ocultas na vitrine pública sem precisar desativar cada item individualmente ou fechar a loja.

### Implementação

**1. Migration — nova coluna**
```sql
ALTER TABLE public.organizations
ADD COLUMN paused_categories jsonb DEFAULT '[]'::jsonb;
```

**2. Tipos e hooks**
- `src/hooks/useOrganization.ts` — adicionar `paused_categories?: string[] | null` ao tipo `Organization` e ao `select`
- `src/hooks/useAuth.tsx` — incluir `paused_categories` no select de organizações
- `src/components/admin/AdminStoreManager.tsx` — incluir no cast de `orgForComponents`

**3. UI no dashboard (MenuTab)**
Ao lado de cada header de categoria (onde já existem os botões ↑ ↓), adicionar um botão de pausa (⏸/▶). Ao clicar:
- Adiciona/remove a categoria do array `paused_categories`
- Salva direto no banco (`supabase.update`)
- Categoria pausada aparece com opacidade reduzida e badge "Pausada"
- Itens da categoria permanecem intactos (não muda `available` dos itens)

**4. Filtragem na vitrine pública**
- `src/pages/UnitPage.tsx` — no `buildGroups`, filtrar categorias que estão em `paused_categories`
- `src/pages/TableOrderPage.tsx` — mesmo filtro no `orderedCats`
- Categorias pausadas simplesmente não aparecem para o cliente

**5. Validação no pedido (trigger SQL)**
Opcional mas recomendado: atualizar `validate_store_open_for_order` para rejeitar itens de categorias pausadas. Porém como a categoria já some da vitrine, o risco é mínimo — implementar apenas o filtro no front por ora.

### Arquivos modificados
- Migration: nova coluna `paused_categories`
- `src/hooks/useOrganization.ts`
- `src/hooks/useAuth.tsx`
- `src/components/admin/AdminStoreManager.tsx`
- `src/components/dashboard/MenuTab.tsx` — botão pausar/retomar por categoria
- `src/pages/UnitPage.tsx` — filtro de categorias pausadas
- `src/pages/TableOrderPage.tsx` — filtro de categorias pausadas

### Sem breaking changes
Array vazio por padrão = todas as categorias visíveis. Lojas existentes não são afetadas.

