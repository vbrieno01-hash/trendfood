

# Corrigir constraint do banco de dados para aceitar "awaiting_payment"

## Problema

A tabela `orders` tem uma CHECK constraint (`orders_status_check`) que permite apenas os valores: `pending`, `preparing`, `ready`, `delivered`. O codigo tenta inserir pedidos com status `awaiting_payment` quando o modo PIX esta ativo, causando erro 400.

## Solucao

Executar uma migracao SQL que remove a constraint antiga e cria uma nova incluindo `awaiting_payment`.

## Detalhes tecnicos

### Migracao SQL

```sql
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['pending', 'preparing', 'ready', 'delivered', 'awaiting_payment']));
```

Nenhuma alteracao de codigo e necessaria. Apenas a constraint do banco precisa ser atualizada.

