
# Corrigir impressao automatica via Bluetooth

## Problema

O `print_mode` no banco de dados esta como `'browser'`. Quando chega um pedido novo pelo Realtime, o auto-print chama `printOrderByMode` com modo `'browser'`, que tenta abrir um popup (`window.open`) -- e o navegador bloqueia porque nao veio de um clique do usuario.

Mesmo tendo uma impressora Bluetooth pareada e conectada, o sistema ignora ela porque so olha o modo do banco.

## Solucao

No callback de auto-print do `DashboardPage.tsx`, verificar se tem um dispositivo Bluetooth conectado (`btDeviceRef.current` nao e nulo). Se tiver, usar modo `'bluetooth'` independente do que esta no banco. Isso e logico porque o usuario pareou ativamente a impressora -- entao quer usar ela.

## Alteracao

### `src/pages/DashboardPage.tsx` (linhas 189-207)

No bloco de auto-print, antes de chamar `printOrderByMode`, calcular o modo efetivo:

```typescript
// Auto-print: enqueue job so no order is ever dropped
if (autoPrintRef.current) {
  printQueue.current.push(async () => {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, name, quantity, price, customer_name")
      .eq("order_id", order.id);
    const fullOrder = { ...order, order_items: items ?? [] };

    // Se tem impressora Bluetooth pareada, usar bluetooth
    // independente do print_mode do banco (que pode ser 'browser')
    const effectiveMode = btDeviceRef.current
      ? 'bluetooth'
      : printModeRef.current;

    await printOrderByMode(
      fullOrder,
      orgNameRef.current,
      effectiveMode,
      orgId!,
      btDeviceRef.current,
      getPixPayload(fullOrder),
      printerWidthRef.current
    );
  });
  processQueue();
}
```

Isso garante:
- Se tem Bluetooth pareado: imprime via Bluetooth (sempre)
- Se nao tem Bluetooth e modo e 'desktop': enfileira na fila (robo imprime)
- Se nao tem Bluetooth e modo e 'browser': tenta popup (pode ser bloqueado, mas e o comportamento esperado para quem nao tem outra opcao)

## Arquivo alterado

- `src/pages/DashboardPage.tsx` -- calcular modo efetivo com prioridade para Bluetooth
