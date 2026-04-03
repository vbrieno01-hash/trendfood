
## Plano: Corrigir erro de recursão infinita na policy de orders

### Problema
A policy `orders_update_public_safe` faz um SELECT na própria tabela `orders` dentro do `WITH CHECK`, causando **recursão infinita** no PostgreSQL. Isso impede qualquer UPDATE público nos pedidos — incluindo aceitar pedidos na cozinha.

### Solução (1 migração SQL, zero código)

1. Criar uma função `SECURITY DEFINER` que busca `organization_id` e `table_number` do pedido sem passar pelas policies RLS
2. Substituir a policy `orders_update_public_safe` por uma nova que usa essa função

```sql
-- Função que busca dados do pedido sem RLS
CREATE OR REPLACE FUNCTION public.get_order_immutable_fields(p_order_id uuid)
RETURNS TABLE(organization_id uuid, table_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.organization_id, o.table_number
  FROM orders o WHERE o.id = p_order_id LIMIT 1;
$$;

-- Substituir policy problemática
DROP POLICY "orders_update_public_safe" ON public.orders;
CREATE POLICY "orders_update_public_safe" ON public.orders
  FOR UPDATE USING (true)
  WITH CHECK (
    (SELECT f.organization_id FROM get_order_immutable_fields(id) f) = organization_id
    AND (SELECT f.table_number FROM get_order_immutable_fields(id) f) = table_number
  );
```

### Resultado
- Pedidos voltam a ser aceitos normalmente na cozinha e gestão
- A proteção contra alteração de `organization_id` e `table_number` continua ativa
- Zero impacto em código frontend
