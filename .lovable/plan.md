
# Adicionar categoria "Promoção do dia" como primeira do cardápio

## Resumo

Adicionar a categoria "Promoção do dia" como a primeira opção na lista de categorias do cardápio, para que o dono do restaurante possa destacar itens em promoção no topo.

## Mudança

### Arquivo: `src/hooks/useMenuItems.ts`

Inserir `{ value: "Promoção do dia", emoji: "🔥" }` como primeiro item do array `CATEGORIES`:

```text
export const CATEGORIES = [
  { value: "Promoção do dia", emoji: "🔥" },   // NOVO - primeira posição
  { value: "Hambúrgueres", emoji: "🍔" },
  { value: "Bebidas", emoji: "🥤" },
  { value: "Porções", emoji: "🍟" },
  { value: "Sobremesas", emoji: "🍰" },
  { value: "Combos", emoji: "🎁" },
  { value: "Outros", emoji: "🍽️" },
];
```

Como o `CATEGORY_ORDER` é gerado automaticamente a partir do `CATEGORIES`, a ordenação no dashboard e na vitrine publica ja vai refletir a nova posição sem nenhuma outra mudança.

## Impacto

- A nova categoria aparece no seletor ao criar/editar itens do cardápio
- Itens marcados como "Promoção do dia" aparecem no topo da lista no dashboard e na loja publica
- Nenhuma mudança no banco de dados necessária (a categoria é salva como texto no campo `category`)
