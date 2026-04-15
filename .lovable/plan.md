

## Corrigir labels "Mesa -1" → usar `getOrderTypeLabel` no WaiterTab e WaiterPage

### Problema
O WaiterTab e WaiterPage sempre exibem `Mesa {table_number}`, sem tratar `table_number === -1` (Balcão) e `table_number === 0` (Entrega). Resultado: aparece "Mesa -1" e "Mesa 0".

### Solução
Importar e usar `getOrderTypeLabel` de `src/lib/orderTypeLabel.ts` em todos os locais que exibem "Mesa {table_number}".

### Alterações

**`src/components/dashboard/WaiterTab.tsx`** — 4 locais:
1. Importar `getOrderTypeLabel`
2. Linha 37: WhatsApp text → `getOrderTypeLabel(order.table_number)`
3. Linha 185: seção PIX → `{getOrderTypeLabel(order.table_number)}`
4. Linha 311: seção Prontos → mesma substituição
5. Linha 456: seção Pagamento → mesma substituição

**`src/pages/WaiterPage.tsx`** — 4 locais:
1. Importar `getOrderTypeLabel`
2. Linha 46: WhatsApp text → `getOrderTypeLabel(order.table_number)`
3. Linha 212: seção PIX → `{getOrderTypeLabel(order.table_number)}`
4. Linha 302: seção Prontos → mesma substituição
5. Linha 435: seção Pagamento → mesma substituição

### Resultado
- `table_number === -1` → "🛒 Balcão"
- `table_number === 0` → "🛵 Entrega"
- `table_number >= 1` → "Mesa N"

Tudo consistente com a Cozinha e o resto do sistema.

