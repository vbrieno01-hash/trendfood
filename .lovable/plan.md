
# Corrigir erro "violates check constraint" nos pedidos

## Problema

O banco de dados tem uma constraint (`orders_status_check`) que so permite os status: `pending`, `preparing`, `ready`, `delivered`. O codigo esta tentando inserir pedidos com status `awaiting_payment`, que nao existe na lista permitida.

## Solucao

Atualizar a constraint do banco de dados para incluir `awaiting_payment` como status valido.

## Detalhes tecnicos

### 1. Migracao SQL

Remover a constraint antiga e criar uma nova que inclua `awaiting_payment`:

```sql
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['pending', 'preparing', 'ready', 'delivered', 'awaiting_payment']));
```

Nenhuma alteracao de codigo e necessaria — o problema e exclusivamente no banco de dados.
