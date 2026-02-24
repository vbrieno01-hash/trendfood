

## Plano: Adicionar categoria "Gourmets" ao cardapio

### O que sera feito
Adicionar a categoria "Gourmets" na lista de categorias do cardapio, posicionada entre "Hambúrgueres triplo" e "Combos com batata frita" (agrupando com os lanches/hamburgueres).

### Alteracao

**Arquivo: `src/hooks/useMenuItems.ts`** (linha 31-32)

Adicionar uma nova entrada no array `CATEGORIES` apos "Hambúrgueres triplo":

```ts
{ value: "Gourmets", emoji: "👨‍🍳" },
```

O array ficara assim:
```ts
export const CATEGORIES = [
  { value: "Promoção do dia", emoji: "🔥" },
  { value: "Lanches com 1 hambúrguer e sem batata frita", emoji: "🍔" },
  { value: "Lanches com 2 hambúrgueres e batata frita", emoji: "🍔🍟" },
  { value: "Hambúrgueres triplo", emoji: "🍔" },
  { value: "Gourmets", emoji: "👨‍🍳" },
  { value: "Combos com batata frita", emoji: "🎁🍟" },
  { value: "Combos sem batata frita", emoji: "🎁" },
  { value: "Bebidas", emoji: "🥤" },
  { value: "Porções", emoji: "🍟" },
  { value: "Sobremesas", emoji: "🍰" },
  { value: "Outros", emoji: "🍽️" },
];
```

### Impacto
- A nova categoria aparece automaticamente no dropdown de selecao ao criar/editar item
- Aparece como grupo separado na listagem do cardapio
- Aparece na pagina publica da loja
- Nenhuma outra alteracao necessaria — tudo e derivado do array `CATEGORIES`

