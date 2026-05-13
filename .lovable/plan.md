## Problema

Na aba **Catálogo → Produto**, na seção **"Composição do Produto"**, ao vincular um insumo (com `cost_per_unit` × `quantity_used`), o campo **Preço** do produto não é preenchido automaticamente. O lojista digita tudo de novo.

## Solução

Quando o lojista vincular/remover insumos na composição (tanto no modo **criar** quanto no modo **editar** produto), calcular:

```
custoTotal = Σ (insumo.cost_per_unit × quantity_used)
```

E preencher o campo **Preço** com esse valor — **somente se o campo estiver vazio/zero**. Nunca sobrescreve preço já digitado pelo lojista.

Mostrar também uma linha pequena abaixo da composição: *"Custo total dos insumos: R$ X,XX"* — para o lojista decidir a margem.

## Arquivos a editar

- `src/components/dashboard/MenuTab.tsx`
  - **`PendingIngredientsSection`** (criar produto): receber callback `onCostChange(custoTotal)` e disparar a cada mudança da lista `pending`.
  - **`IngredientsSection`** (editar produto): mesmo padrão, calcular a partir de `ingredients` carregados do hook.
  - No formulário pai (criar/editar produto):
    - Receber o custo total via callback.
    - Se o campo `price` estiver vazio (`""` / `0` / não tocado pelo usuário), atualizar com `custoTotal`.
    - Adicionar flag `priceTouched` ligada a `onChange` do input de preço para nunca sobrescrever após edição manual.
  - Exibir badge "Custo: R$ X,XX • sugerido como preço mínimo" abaixo da composição.

## Fora de escopo

- Markup automático (3x etc.) — descartado pelo usuário.
- Mudanças no schema do banco. Tudo é cálculo client-side a partir de `stock_items.cost_per_unit` (já existente).
- Recalcular preço de produtos antigos retroativamente.
