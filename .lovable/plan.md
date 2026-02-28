

# Tudo ja esta implementado

A funcionalidade solicitada ja existe no codigo atual:

## O que ja funciona

1. **Secao de ingredientes no modal de edicao** (`MenuTab.tsx` linhas 87-190)
   - Select para escolher insumo do estoque
   - Input numerico para quantidade por venda
   - Botao "Vincular" e lista com remocao

2. **Persistencia no banco** via tabela `menu_item_ingredients` com hooks `useAddMenuItemIngredient` e `useRemoveMenuItemIngredient`

3. **Trigger automatico** `trg_deduct_stock_on_paid` ativo na tabela `orders` — quando `paid` muda para `true`, subtrai insumos e desativa produtos sem estoque

## Unica alteracao possivel

Renomear o titulo da secao de **"Ingredientes vinculados"** para **"Composicao do Produto"** (linha 117 do MenuTab.tsx) para corresponder exatamente ao pedido.

### Passo unico
- Alterar o texto `"Ingredientes vinculados"` para `"Composição do Produto"` na `IngredientsSection` do `MenuTab.tsx`

Nenhuma outra alteracao e necessaria — o fluxo completo de estoque inteligente ja esta operacional.

