

## Corrigir label "ENTREGA" em pedidos de Balcão

### Problema
Pedidos feitos pela aba Balcão usam `table_number: 0`, que é o mesmo valor usado para entregas. Por isso, todos aparecem como "🛵 ENTREGA" na cozinha, histórico e notificações.

### Solução
Usar `table_number: -1` para pedidos de balcão, diferenciando de entrega (`0`) e mesas (`1+`). Atualizar toda a lógica de exibição para tratar os 3 casos.

### Mudanças

**1. `src/components/dashboard/CounterTab.tsx`**
- Alterar `tableNumber: 0` → `tableNumber: -1`

**2. `src/components/dashboard/KitchenTab.tsx`** (3 pontos)
- Labels: `table_number === -1 ? "🛒 BALCÃO" : table_number === 0 ? "🛵 ENTREGA" : Mesa N`
- Não criar delivery quando `table_number === -1` (só para `=== 0`)
- Notificação: label correto para balcão

**3. `src/pages/KitchenPage.tsx`** (mesmas mudanças do KitchenTab)

**4. `src/components/dashboard/HistoryTab.tsx`**
- Labels e filtros: tratar `-1` como "Balcão"

**5. `src/pages/DashboardPage.tsx`**
- Notificação: label correto para balcão

**6. `src/lib/receiptData.ts`**
- Label no recibo: "BALCÃO" quando `table_number === -1`

### Helper
Criar uma função utilitária `getOrderTypeLabel(table_number)` para centralizar a lógica e evitar repetição:
```ts
export const getOrderTypeLabel = (tn: number) =>
  tn === -1 ? "🛒 Balcão" : tn === 0 ? "🛵 Entrega" : `Mesa ${tn}`;
```

