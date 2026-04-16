
## Diagnóstico: gravação dos métodos Débito/Crédito

### ✅ O que está 100% correto
- **Gravação no banco**: `WaiterTab`, `CounterTab`, `TableOrderPage` e `CheckoutPage` salvam `card_debit` ou `card_credit` no campo `payment_method` da tabela `orders` — confirmado no banco (já existe 1 registro `card_credit`).
- **Visualização em tempo real**: KitchenTab, WaiterTab e KitchenPage exibem badges coloridas separadas (sky para Débito, indigo para Crédito).
- **Relatórios do lojista** (`ReportsTab`): mapa de labels já tem `card_debit: "Débito"` e `card_credit: "Crédito"`.
- **Relatório Admin** (`AdminReportsTab`): tabela na tela e CSV exportam "Cartão Débito" / "Cartão Crédito" via `PAYMENT_LABELS`.

### ❌ Falhas encontradas (3 pontos)

**1. Recibo térmico/PDF de comanda — NÃO mostra Débito/Crédito**
`receiptData.ts` (linha 290) lê o pagamento de `parsed.payment` (extraído do campo `notes` via `PGTO:...`). O `payment_method` da tabela `orders` (que tem `card_debit`/`card_credit`) **não é usado no recibo**. Resultado: o recibo impresso/PDF mostra só o que o lojista digitou em texto livre nas notas, sem distinguir débito de crédito.
→ **Correção**: usar `order.payment_method` como fallback prioritário quando `parsed.payment` não existir; e mapear `card_debit` → "DEBITO", `card_credit` → "CREDITO" antes de imprimir.

**2. CSV do Histórico (`HistoryTab`) — NÃO exporta a forma de pagamento**
A linha 150 só exporta colunas `Data, Mesa/Tipo, Itens, Valor, Status Pagamento (Pago/Não pago), Observações`. Não há coluna com **qual** método de pagamento foi usado.
→ **Correção**: adicionar coluna "Forma de Pagamento" mapeando `card_debit` → "Débito", `card_credit` → "Crédito", `pix` → "PIX", `cash` → "Dinheiro", `card` → "Cartão" (legado).

**3. Dados legados sujos no banco** (não quebra, mas atrapalha relatórios)
O banco tem 11 variantes do mesmo conceito: `cartão de débito` (121), `cartão de crédito` (38), `dinheiro` (206), `maquininha na entrega` (60), `Dinheiro`, `Cartão`, `card`, etc. Esses pedidos antigos NÃO aparecem agrupados como "Débito"/"Crédito" nos relatórios — aparecem como linhas separadas.
→ **Correção opcional (migração SQL)**: normalizar via UPDATE — `cartão de débito` → `card_debit`, `cartão de crédito` → `card_credit`, `dinheiro`/`Dinheiro` → `cash`, `maquininha na entrega` → `card` (genérico, pois não dá pra saber se foi débito ou crédito retroativamente).

### Plano de correção

**Arquivo 1** — `src/lib/receiptData.ts` (linha ~290)
Estender `PrintableOrder` para incluir `payment_method`. Se `parsed.payment` (texto livre nas notas) estiver ausente, usar o campo do banco mapeado para PT-BR maiúsculo (DINHEIRO/PIX/DEBITO/CREDITO).

**Arquivo 2** — `src/components/dashboard/HistoryTab.tsx` (linha ~150)
Adicionar coluna "Forma de Pagamento" no CSV com o mesmo mapa de labels já usado em outros lugares.

**Arquivo 3** — Migração SQL (opcional, recomendado)
```sql
UPDATE orders SET payment_method = 'card_debit'  WHERE payment_method ILIKE 'cartão de débito';
UPDATE orders SET payment_method = 'card_credit' WHERE payment_method ILIKE 'cartão de crédito';
UPDATE orders SET payment_method = 'cash'        WHERE payment_method ILIKE 'dinheiro';
UPDATE orders SET payment_method = 'card'        WHERE payment_method ILIKE 'maquininha na entrega';
```
Pedidos antigos `card`/`maquininha na entrega` continuam aparecendo como "Cartão" genérico (sem como adivinhar se foi débito ou crédito retroativamente — só pedidos NOVOS terão a separação correta).

### Resultado
Após as correções: **gravação, visualização em tela, recibo impresso (papel + PDF), CSV do histórico e relatórios admin** — todos refletindo Débito vs Crédito separadamente. Pedidos novos = 100% rastreáveis.
