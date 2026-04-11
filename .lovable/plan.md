

## Corrigir contador de pedidos para nunca diminuir

### Problema

O contador usa `SELECT count(*) FROM orders`, mas pedidos fantasma (sem itens) são deletados periodicamente pelo sistema de limpeza. Quando isso acontece, o `count(*)` diminui e o contador na landing page "volta" — saindo de 600+ para 537.

### Solução

Criar uma tabela `platform_counters` com um contador monotônico que só incrementa. Em vez de contar linhas na tabela `orders`, o sistema mantém um número que nunca diminui.

### Etapas

**1. Migração SQL**

- Criar tabela `platform_counters` com uma linha fixa:
  ```sql
  CREATE TABLE platform_counters (
    id int PRIMARY KEY CHECK (id = 1),
    total_orders bigint NOT NULL DEFAULT 0
  );
  ```
- Inserir o valor atual: `INSERT INTO platform_counters (id, total_orders) SELECT 1, count(*) FROM orders;`
- Criar trigger na tabela `orders` que incrementa `total_orders` a cada INSERT (nunca decrementa no DELETE)
- Atualizar a função `get_total_order_count()` para ler de `platform_counters` em vez de `count(*)`
- RLS: SELECT público, UPDATE/INSERT apenas por service_role

**2. Trigger**

```sql
CREATE FUNCTION increment_order_counter() RETURNS trigger AS $$
BEGIN
  UPDATE platform_counters SET total_orders = total_orders + 1 WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_orders
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION increment_order_counter();
```

**3. Nenhuma mudança no frontend**

O `Index.tsx` já chama `get_total_order_count()` — só a função muda internamente. O contador nunca mais vai diminuir.

