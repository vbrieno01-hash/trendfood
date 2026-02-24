

## Plano: Adicionar categorias detalhadas ao cardápio

### Contexto
O usuário quer categorias mais descritivas no cardápio, como as mostradas nas imagens de referência:
- "Lanches com 1 hambúrguer e sem batata frita"
- "Lanches com 2 hambúrgueres e batata frita"
- "Hambúrgueres triplo"
- "Combos com batata frita"
- "Combos sem batata frita"

### Mudança

**Arquivo: `src/hooks/useMenuItems.ts` (linhas 27-34)**

Expandir o array `CATEGORIES` com as novas subcategorias:

```typescript
export const CATEGORIES = [
  { value: "Promoção do dia", emoji: "🔥" },
  { value: "Lanches com 1 hambúrguer e sem batata frita", emoji: "🍔" },
  { value: "Lanches com 2 hambúrgueres e batata frita", emoji: "🍔🍟" },
  { value: "Hambúrgueres triplo", emoji: "🍔" },
  { value: "Combos com batata frita", emoji: "🎁🍟" },
  { value: "Combos sem batata frita", emoji: "🎁" },
  { value: "Bebidas", emoji: "🥤" },
  { value: "Porções", emoji: "🍟" },
  { value: "Sobremesas", emoji: "🍰" },
  { value: "Outros", emoji: "🍽️" },
];
```

**Arquivo: `src/pages/TableOrderPage.tsx` (linhas 26-28)**

Atualizar o `CATEGORY_ORDER` local para incluir as novas categorias:

```typescript
const CATEGORY_ORDER = [
  "Promoção do dia",
  "Lanches com 1 hambúrguer e sem batata frita",
  "Lanches com 2 hambúrgueres e batata frita",
  "Hambúrgueres triplo",
  "Combos com batata frita",
  "Combos sem batata frita",
  "Bebidas", "Porções", "Sobremesas", "Outros",
];
```

**Arquivo: `src/components/dashboard/MenuTab.tsx` (linha 35)**

Atualizar o `EMPTY_FORM` para usar a primeira categoria válida que não seja promoção:

```typescript
category: "Lanches com 1 hambúrguer e sem batata frita",
```

### Impacto
- A coluna `category` no banco é texto livre — não precisa de migração SQL
- Itens existentes que usam "Hambúrgueres" ou "Combos" antigos continuarão aparecendo na seção "Outros" (ou o dono pode reclassificá-los editando cada item)
- Funciona em web, APK e todas as telas: dashboard (MenuTab), loja pública (UnitPage), mesa (TableOrderPage)

### Detalhes técnicos
- `CATEGORIES` é a fonte de verdade usada em 3 arquivos: `useMenuItems.ts`, `MenuTab.tsx`, `UnitPage.tsx`
- `TableOrderPage.tsx` tem seu próprio `CATEGORY_ORDER` que precisa ser sincronizado
- As pills de navegação no UnitPage se adaptam automaticamente pois são geradas do `CATEGORIES`
- O select de categoria no modal de criação/edição do MenuTab também se adapta automaticamente

