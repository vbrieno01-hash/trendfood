

# Corrigir impressao automatica quando o usuario esta em outra aba

## Problema

Quando um novo pedido chega via Realtime, o sistema:
1. Recebe o evento INSERT e adiciona o ID em `pendingPrintIds`
2. Chama `qc.invalidateQueries` para atualizar `dashOrders`
3. O useEffect que depende de `dashOrders` procura os pedidos pendentes e imprime

O problema: quando o usuario esta na aba "Home" ou outra aba do dashboard, o React Query **nao refaz o fetch imediatamente** porque a query pode estar "stale" ou o browser pode ter suspendido a atividade da aba em background. O `dashOrders` nunca atualiza, entao o effect de impressao nunca encontra o pedido.

## Solucao

Mudar a logica para que, ao receber o evento Realtime, o sistema busque o pedido completo (com items) **diretamente** no callback, sem depender do cache do React Query. Assim a impressao acontece imediatamente, independente de qual aba esteja ativa.

### Mudanca em `src/pages/DashboardPage.tsx`

1. **No callback do Realtime** (onde recebe o INSERT): em vez de apenas adicionar o ID em `pendingPrintIds` e esperar o React Query atualizar, fazer uma query direta ao banco para buscar o pedido com seus items.

2. **Imprimir diretamente** dentro do callback apos obter os dados completos.

3. **Remover** o useEffect separado de "print pending orders" que depende de `dashOrders`, pois a impressao agora acontece no proprio callback do Realtime.

### Codigo da mudanca principal

```typescript
// Dentro do callback do Realtime, ao receber INSERT:
const order = payload.new as Order;
if (knownIds.current.has(order.id)) return;
knownIds.current.add(order.id);

playBell();

// Notificacao
if (notificationsRef.current && Notification.permission === "granted") {
  const tableLabel = order.table_number === 0 ? "Entrega" : `Mesa ${order.table_number}`;
  new Notification(`Novo pedido! ${tableLabel}`, { icon: "/pwa-192.png" });
}

qc.invalidateQueries({ queryKey: ["orders", orgId] });

// Auto-print: buscar items diretamente e imprimir
if (autoPrintRef.current && !isPrintingRef.current) {
  isPrintingRef.current = true;
  supabase
    .from("order_items")
    .select("id, name, quantity, price, customer_name")
    .eq("order_id", order.id)
    .then(async ({ data: items }) => {
      const fullOrder = { ...order, order_items: items ?? [] };
      try {
        await printOrderByMode(fullOrder, orgName, printMode, orgId!, btDevice, getPixPayload(fullOrder), printerWidth);
      } catch (err) {
        console.error("[Dashboard] Auto-print failed:", err);
      }
      isPrintingRef.current = false;
    })
    .catch(() => { isPrintingRef.current = false; });
}
```

### Resumo das alteracoes

- `src/pages/DashboardPage.tsx`:
  - Modificar o callback do Realtime para buscar items e imprimir diretamente
  - Remover o useEffect de `pendingPrintIds` / `dashOrders` (linhas ~178-199)
  - Remover o ref `pendingPrintIds` que nao sera mais necessario

