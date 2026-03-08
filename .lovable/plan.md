

## Diagnóstico: Comandas sem itens no KDS

### Causa raiz

Existe uma **condição de corrida (race condition)** no fluxo de criação de pedidos:

1. `usePlaceOrder` insere o registro na tabela `orders` primeiro
2. O Realtime dispara imediatamente um evento INSERT
3. O KDS recebe o evento e faz `invalidateQueries`, que re-busca `orders` com `order_items(*)`
4. Porém os `order_items` ainda **não foram inseridos** (são inseridos DEPOIS do order)
5. Resultado: o KDS mostra o pedido com **lista de itens vazia**

O auto-print do KDS também falha porque verifica `order_items?.length > 0` e pula pedidos sem itens.

A comanda que vai para `fila_impressao` funciona corretamente porque é enfileirada pelo próprio cliente com os itens inline, sem depender da re-busca.

### Solução

Adicionar um **delay/retry** na invalidação do KDS quando um novo pedido chega, para dar tempo dos `order_items` serem inseridos antes de re-buscar.

### Alterações

**1. `src/components/dashboard/KitchenTab.tsx` e `src/pages/KitchenPage.tsx`**

No handler do Realtime (evento INSERT), trocar a invalidação imediata por uma invalidação com delay:

```typescript
// Antes:
qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });

// Depois:
// Delay para aguardar order_items serem inseridos
setTimeout(() => {
  qc.invalidateQueries({ queryKey: ["orders", orgId, ["pending", "preparing"]] });
}, 1500);
```

**2. Auto-print retry no mesmo arquivo**

No `useEffect` que processa `pendingPrintIds`, adicionar lógica de retry: se um pedido na fila tem 0 itens, não removê-lo da fila — aguardar o próximo ciclo de re-render quando os itens já terão sido carregados.

```typescript
// Não remover da fila se order_items está vazio — vai tentar de novo
const toPrint = orders.filter(
  (o) => pendingPrintIds.current.has(o.id) && (o.order_items?.length ?? 0) > 0
);
// Adicionar timeout para re-tentar caso itens ainda não chegaram
const pendingWithoutItems = orders.filter(
  (o) => pendingPrintIds.current.has(o.id) && (o.order_items?.length ?? 0) === 0
);
if (pendingWithoutItems.length > 0 && toPrint.length === 0) {
  setTimeout(() => qc.invalidateQueries({ queryKey: ["orders", orgId] }), 2000);
}
```

Ambos os arquivos (KitchenTab e KitchenPage) receberão as mesmas alterações para manter a paridade.

