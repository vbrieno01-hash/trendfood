

## Problema: Triggers ausentes no banco de dados

A função `deduct_stock_and_disable()` existe e está correta -- ela deduz estoque e desativa produtos quando o estoque zera. Porém, **nenhum trigger está registrado** para chamá-la. O mesmo vale para `set_order_number()` que deveria numerar pedidos automaticamente.

### Correção

Criar uma migration SQL com dois triggers:

1. **`trg_set_order_number`** na tabela `orders`, `BEFORE INSERT`, chamando `set_order_number()` para numerar pedidos automaticamente.

2. **`trg_deduct_stock`** na tabela `orders`, `AFTER UPDATE`, chamando `deduct_stock_and_disable()` para deduzir estoque quando `paid` muda de `false` para `true`.

### SQL da migration

```sql
-- Trigger para numerar pedidos
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Trigger para deduzir estoque ao pagar
CREATE TRIGGER trg_deduct_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.paid = false AND NEW.paid = true)
  EXECUTE FUNCTION public.deduct_stock_and_disable();
```

### Impacto

- Nenhuma alteração de código necessária
- Pedidos futuros terão numeração automática
- Ao confirmar pagamento, o estoque será deduzido e produtos sem estoque serão desativados automaticamente

