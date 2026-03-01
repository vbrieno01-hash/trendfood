

## Problema Encontrado: Dedução Duplicada de Estoque

O teste revelou que o estoque de **Água** caiu de 25 para 23 ao invés de 24. Isso acontece porque existem **dois triggers idênticos** na tabela `orders`:

- `trg_deduct_stock` (criado agora)
- `trg_deduct_stock_on_paid` (já existia previamente)

Ambos executam a mesma função `deduct_stock_and_disable()`, causando dedução duplicada.

### Correção

Criar uma migration SQL para remover o trigger duplicado:

```sql
DROP TRIGGER IF EXISTS trg_deduct_stock_on_paid ON public.orders;
```

Isso manterá apenas `trg_deduct_stock` ativo, eliminando a dedução dupla.

### Impacto
- Nenhuma alteração de código frontend necessária
- Apenas remoção de um trigger duplicado no banco
- Após a correção, cada pedido pago deduzirá a quantidade correta do estoque

