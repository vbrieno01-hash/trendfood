

# Reverter mudança que quebrou auto-print

## O que aconteceu

A alteracao anterior adicionou um `if (mode !== 'browser')` no callback Realtime de auto-print, fazendo com que pedidos novos NAO chamem `printOrderByMode` quando o modo e `browser`. Isso quebrou a impressao automatica para quem esta usando Bluetooth mas ainda tem `print_mode: browser` no banco.

## Correcao

Reverter o condicional no `DashboardPage.tsx`. Voltar a chamar `printOrderByMode` sempre, independente do modo. O popup bloqueado no modo browser e inofensivo — o pedido ja esta na `fila_impressao` de qualquer forma, e para quem usa Bluetooth a impressao funciona normalmente.

## Detalhe tecnico

### `src/pages/DashboardPage.tsx` (linhas 189-214)

Remover o `if (mode !== 'browser')` e voltar ao codigo original que sempre chama `printOrderByMode`:

```typescript
// Auto-print: enqueue job so no order is ever dropped
if (autoPrintRef.current) {
  printQueue.current.push(async () => {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, name, quantity, price, customer_name")
      .eq("order_id", order.id);
    const fullOrder = { ...order, order_items: items ?? [] };
    await printOrderByMode(
      fullOrder,
      orgNameRef.current,
      printModeRef.current,
      orgId!,
      btDeviceRef.current,
      getPixPayload(fullOrder),
      printerWidthRef.current
    );
  });
  processQueue();
}
```

## Arquivo alterado

- `src/pages/DashboardPage.tsx` — reverter condicional, voltar a chamar printOrderByMode sempre
