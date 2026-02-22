

# Corrigir impressao automatica Bluetooth -- auto-print nunca executa

## Problema raiz

O callback Realtime de auto-print (linha 174 do DashboardPage) faz um `return` antecipado se o `order.id` ja existe em `knownIds`. Essa mesma `knownIds` e populada automaticamente pelo `useEffect` da linha 238 que roda sempre que `dashOrders` atualiza. Quando um INSERT chega, o hook `useOrders` tambem recebe o evento Realtime e invalida o cache, causando refetch. Se o React processa esse refetch e atualiza `dashOrders` antes do callback `dashboard-autoprint` executar, o `knownIds` ja contem o ID do pedido novo, e o auto-print e silenciosamente pulado -- sem bell, sem notificacao, sem impressao.

Alem disso, nao existe nenhum `console.log` no fluxo de auto-print, tornando impossivel diagnosticar o problema em producao.

## Solucao

1. Separar a logica de deduplicacao: usar um `autoPrintedIds` ref exclusivo para auto-print, independente de `knownIds`
2. Mover o enfileiramento de impressao para ANTES do check de `knownIds` (ou usar check proprio)
3. Adicionar logs de diagnostico em pontos criticos do fluxo

## Alteracoes

### `src/pages/DashboardPage.tsx`

#### 1. Novo ref para deduplicar impressoes (apos linha 97)

Adicionar:
```typescript
const autoPrintedIds = useRef<Set<string>>(new Set());
```

#### 2. Reestruturar o callback Realtime (linhas 172-228)

Separar o auto-print do guard de knownIds:

```typescript
(payload) => {
  const order = payload.new as Order;

  // Auto-print: verifica com seu proprio set de deduplicacao
  if (autoPrintRef.current && !autoPrintedIds.current.has(order.id)) {
    autoPrintedIds.current.add(order.id);
    console.log("[AutoPrint] Novo pedido detectado:", order.id, "mesa:", order.table_number);

    printQueue.current.push(async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("id, name, quantity, price, customer_name")
        .eq("order_id", order.id);
      const fullOrder = { ...order, order_items: items ?? [] };

      // Reconexao sob demanda
      if (!btDeviceRef.current && getStoredDeviceId()) {
        try {
          const reconnected = await reconnectStoredPrinter();
          if (reconnected) {
            setBtDevice(reconnected);
            setBtConnected(true);
            btDeviceRef.current = reconnected;
            attachDisconnectHandler(reconnected);
            console.log("[AutoPrint] Bluetooth reconnected on-demand");
          }
        } catch {
          console.warn("[AutoPrint] On-demand BT reconnect failed");
        }
      }

      const effectiveMode = (btDeviceRef.current || getStoredDeviceId())
        ? 'bluetooth' as const
        : printModeRef.current;

      console.log("[AutoPrint] Imprimindo pedido", order.id, "modo:", effectiveMode, "btDevice:", !!btDeviceRef.current);

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

  // Bell + notificacao: usa knownIds para nao repetir
  if (knownIds.current.has(order.id)) return;
  knownIds.current.add(order.id);

  playBell();

  if (notificationsRef.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
    const tableLabel = order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
    new Notification(`Novo pedido! ${tableLabel}`, {
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
    });
  }

  qc.invalidateQueries({ queryKey: ["orders", orgId] });
}
```

A mudanca chave: o auto-print agora roda ANTES do check de `knownIds` e usa seu proprio set `autoPrintedIds` para deduplicacao. Isso garante que mesmo se `knownIds` ja tiver o ID (por causa de race com refetch), a impressao ainda acontece.

#### 3. Popular autoPrintedIds com pedidos existentes (na useEffect da linha 238)

```typescript
useEffect(() => {
  dashOrders.forEach((o) => {
    knownIds.current.add(o.id);
    autoPrintedIds.current.add(o.id); // Nao reimprimir pedidos ja carregados
  });
}, [dashOrders]);
```

## Arquivos alterados

- `src/pages/DashboardPage.tsx` -- separar auto-print do guard de knownIds + adicionar logs de diagnostico

