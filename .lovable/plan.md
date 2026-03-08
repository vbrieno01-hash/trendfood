

## Diagnóstico: Comanda imprime sem itens, sem preços e sem totais

### Causa raiz identificada

O problema está no **DashboardPage.tsx** (linha 214-218). Quando o Realtime detecta um novo pedido, o auto-print busca os `order_items` diretamente no banco **imediatamente** — mas os itens ainda não foram inseridos (race condition). Resultado:

- `items` retorna `[]`
- A comanda imprime com **0 itens**, **sem preços**, **sem totais**, **sem pagamento**
- Apenas header (PARA ENTREGA, data, loja, #pedido) e dados do cliente (do campo `notes`) aparecem

O fix anterior (1.5s delay) foi aplicado apenas no `KitchenTab.tsx` e `KitchenPage.tsx`, mas o **DashboardPage.tsx** tem seu próprio auto-print que não recebeu a correção.

### Solução

Adicionar **retry com delay** na busca de `order_items` dentro do auto-print do `DashboardPage.tsx`. Em vez de buscar uma vez e imprimir (mesmo com 0 itens), fazer até 3 tentativas com intervalo de 1.5s:

**`src/pages/DashboardPage.tsx`** — Modificar o bloco de auto-print (linhas 214-219):

```typescript
printQueue.current.push(async () => {
  // Retry up to 3 times with 1.5s delay to wait for order_items
  let items: any[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
    const { data } = await supabase
      .from("order_items")
      .select("id, name, quantity, price, customer_name")
      .eq("order_id", order.id);
    items = data ?? [];
    if (items.length > 0) break;
  }
  if (items.length === 0) {
    console.warn("[AutoPrint] Pedido sem itens após 3 tentativas:", order.id);
    return; // Don't print empty receipt
  }
  const fullOrder = { ...order, order_items: items };
  // ... rest of print logic unchanged
```

Isso garante que:
1. Espera até 4.5s para os itens aparecerem no banco
2. Se após 3 tentativas não houver itens, **não imprime** (evita comanda em branco)
3. Se os itens chegam na 1a tentativa (cenário normal), não há delay extra

Mesma lógica de retry será aplicada nos auto-prints do **KitchenTab.tsx** e **KitchenPage.tsx** que fazem busca direta similar.

