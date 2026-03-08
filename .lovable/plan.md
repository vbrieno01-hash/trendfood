

## Verificação completa do fix de comandas sem itens

### Status atual dos fixes

| Componente | Fix aplicado? | Mecanismo |
|---|---|---|
| `DashboardPage.tsx` auto-print | Sim | Retry 3x com 1.5s delay na busca direta de `order_items` |
| `KitchenTab.tsx` Realtime | Sim | Delay 1.5s no `invalidateQueries` + retry auto-print |
| `KitchenPage.tsx` Realtime | Sim | Delay 1.5s no `invalidateQueries` + retry auto-print |
| `useOrders.ts` hook Realtime | **NÃO** | Invalidação imediata na linha 134 |
| `usePlaceOrder` → `fila_impressao` | OK (sem bug) | Itens vêm do cliente, não do banco |

### Problema restante

O hook `useOrders.ts` (linha 134) é usado por **todos os componentes** que listam pedidos. Ele tem seu próprio canal Realtime que faz `invalidateQueries` **imediatamente** quando um pedido é inserido. Isso significa:

1. Pedido inserido → `useOrders` busca **imediatamente** (0 itens)
2. Cache do React Query populado com pedido sem itens
3. KitchenTab/KitchenPage auto-print vê 0 itens → entra em retry
4. Após 1.5s, o delayed invalidation refaz a busca → agora com itens

O retry funciona, mas há uma janela onde a UI mostra o pedido sem itens por 1.5s. E se o retry falhar por qualquer motivo (tab em background, etc.), o pedido fica sem itens permanentemente na tela até refresh manual.

### Solução: delay no hook central

Adicionar delay de 1.5s **apenas para eventos INSERT** no `useOrders.ts` (linha 133-135). Isso garante que **todos os clientes** (atuais e futuros) se beneficiem, pois o fix está na camada compartilhada.

**`src/hooks/useOrders.ts`** — Modificar o Realtime handler (linhas 130-136):

```typescript
.on(
  "postgres_changes",
  { event: "*", schema: "public", table: "orders", filter: `organization_id=eq.${organizationId}` },
  (payload) => {
    if (payload.eventType === "INSERT") {
      // Delay for INSERT to let order_items be inserted first
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["orders", organizationId] });
      }, 1500);
    } else {
      qc.invalidateQueries({ queryKey: ["orders", organizationId] });
    }
  }
)
```

Mesma lógica para os canais de `orders-unpaid` (linha 274) e `orders-awaiting-payment` (linha 336).

### Impacto

- **Clientes existentes**: Sim, todos se beneficiam automaticamente pois o código é compartilhado
- **Clientes futuros**: Sim, mesma base de código
- **Todos os modos de impressão** (browser, bluetooth, desktop): Cobertos pelo fix no DashboardPage + hook central
- **UI do KDS**: Pedidos aparecerão com itens desde o primeiro render (sem flash de "0 itens")

### Arquivos a alterar

1. `src/hooks/useOrders.ts` — Delay condicional no Realtime (INSERT only)

