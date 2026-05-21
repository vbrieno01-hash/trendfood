## Correção do bug #6 — Relatório do Admin

**Arquivo:** `src/components/admin/AdminReportsTab.tsx` (linha 48-52)

**Mudança:** adicionar 1 filtro na query do Supabase para ignorar pedidos cancelados, recusados e estornados.

```ts
.from("orders")
.select("...")
.gte("created_at", ...)
.lte("created_at", ...)
.not("status", "in", "(cancelled,rejected,refunded)")  // ← linha nova
.order("created_at", { ascending: false });
```

**Resultado:**
- "Total Faturado" e a lista de pedidos passam a mostrar **só pedidos válidos**.
- Pedidos cancelados/recusados deixam de inflar o número.

**Impacto nas lojas:** zero.
- Só altera a tela `/admin` → Relatórios (acesso restrito ao seu e-mail).
- Não toca em RLS, triggers, edge functions, banco, fluxo de pedido, impressão, pagamento.
- Reversível em 1 linha.

**Relatório do lojista (pro contador):** continua intacto — já filtra `status = "delivered"` corretamente.
