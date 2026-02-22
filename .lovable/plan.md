

# Corrigir impressao automatica Bluetooth - reconexao sob demanda

## Problema

Quando chega um pedido via Realtime, o auto-print verifica `btDeviceRef.current`. Se o auto-reconnect falhou (comum com Bluetooth), o ref e `null` e o sistema cai no modo `'browser'`, que e bloqueado pelo navegador.

O auto-reconnect pode falhar por varias razoes: impressora desligada no momento do reload, `watchAdvertisements` nao suportado, timeout. Quando isso acontece, a impressao automatica fica travada ate o usuario parear manualmente de novo.

## Solucao

Adicionar reconexao sob demanda no bloco de auto-print: se `btDeviceRef.current` e null mas existe um device salvo no localStorage, tentar reconectar antes de imprimir.

## Alteracao

### `src/pages/DashboardPage.tsx` (bloco auto-print, linhas 189-213)

No callback de auto-print, antes de calcular `effectiveMode`:

```typescript
// Auto-print: enqueue job so no order is ever dropped
if (autoPrintRef.current) {
  printQueue.current.push(async () => {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, name, quantity, price, customer_name")
      .eq("order_id", order.id);
    const fullOrder = { ...order, order_items: items ?? [] };

    // Se nao tem device mas tem ID salvo, tentar reconectar sob demanda
    if (!btDeviceRef.current && getStoredDeviceId()) {
      try {
        const reconnected = await reconnectStoredPrinter();
        if (reconnected) {
          setBtDevice(reconnected);
          setBtConnected(true);
          btDeviceRef.current = reconnected; // Atualiza ref imediatamente
          attachDisconnectHandler(reconnected);
          console.log("[AutoPrint] Bluetooth reconnected on-demand");
        }
      } catch {
        console.warn("[AutoPrint] On-demand BT reconnect failed");
      }
    }

    const effectiveMode = btDeviceRef.current
      ? 'bluetooth' as const
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

Isso garante que:
- Se o auto-reconnect do mount funcionou: imprime direto via Bluetooth (ja funciona)
- Se o auto-reconnect do mount falhou mas a impressora agora esta ligada: tenta reconectar no momento do pedido
- Se a reconexao sob demanda tambem falha: cai no modo do banco (browser/desktop) como fallback
- A reconexao so e tentada uma vez por job (nao trava a fila)

## Arquivo alterado

- `src/pages/DashboardPage.tsx` -- reconexao Bluetooth sob demanda no auto-print

