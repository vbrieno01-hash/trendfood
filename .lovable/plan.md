## Problema

O tema automático funciona em quase tudo, mas o **drawer de detalhes do item** (modal que abre ao clicar em um produto) continua laranja em todas as lojas.

## Causa

`src/components/unit/ItemDetailDrawer.tsx` (linhas 36-39) tem um comentário "Padrão TrendFood: laranja em tudo" e **ignora** as props `primaryColor` / `buttonColor` / `categoryColor` que o `UnitPage` já passa corretamente:

```ts
const priceColor = primaryColor || accentColor || "#f97316";
const btnColor = "#f97316";   // ← hardcoded
const catColor = "#f97316";   // ← hardcoded
```

Isso afeta: preço do item, botões `+` dos adicionais, badge de adicional selecionado, botão `+` do quantity selector e o botão grande "Adicionar R$ XX".

## Solução

Em `src/components/unit/ItemDetailDrawer.tsx`, trocar as 3 linhas para respeitar as props (que já vêm corretas do `UnitPage`, derivadas da paleta automática):

```ts
const priceColor = accentColor || primaryColor || "#f97316";
const btnColor   = buttonColor  || primaryColor || "#f97316";
const catColor   = categoryColor || buttonColor || primaryColor || "#f97316";
```

Nenhuma outra mudança é necessária — o `UnitPage` já passa `primaryColor={effectivePrimaryColor}` para o drawer, então a cor extraída da logo vai fluir naturalmente.

## Escopo

- 1 arquivo, 3 linhas alteradas
- Sem mudanças em backend, props, ou outros componentes
