

## Plano: Corrigir contador de pedidos da landing page

### Problema
A policy de segurança `orders_select_public_recent` que adicionamos restringe leitura pública a pedidos das últimas 24h. O contador da landing page faz um `SELECT count(*)` anônimo, então só vê pedidos recentes — por isso sumiu o número de 500+.

### Solução
Criar uma função `SECURITY DEFINER` que retorna a contagem total de pedidos sem passar pelo RLS. Isso mantém a proteção de dados pessoais (ninguém lê os campos dos pedidos antigos) mas permite contar todos.

| # | O que | Onde |
|---|-------|------|
| 1 | Criar função `get_total_order_count()` SECURITY DEFINER que retorna `count(*)` da tabela orders | Migração SQL |
| 2 | Usar `supabase.rpc('get_total_order_count')` no Index.tsx em vez de `supabase.from("orders").select("*", { count: "exact", head: true })` | `src/pages/Index.tsx` |

### Detalhes técnicos

```sql
CREATE OR REPLACE FUNCTION public.get_total_order_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT count(*) FROM orders; $$;
```

No Index.tsx:
```typescript
supabase.rpc('get_total_order_count')
  .then(({ data }) => { if (data) setOrderCount(Number(data)); });
```

### Resultado
- Contador volta a mostrar todos os 500+ pedidos
- Dados pessoais dos pedidos antigos continuam protegidos
- 1 migração SQL + 1 linha editada no Index.tsx

