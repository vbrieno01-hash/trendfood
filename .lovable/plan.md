

## Corrigir realtime do painel de Pagamento

### Problema
Dois componentes `WaiterTab` são montados simultaneamente no `OperationsTab` (um com `section="ready"` e outro com `section="unpaid"`). Ambos chamam os mesmos hooks (`useDeliveredUnpaidOrders`, `useAwaitingPaymentOrders`), criando canais Realtime duplicados com o mesmo nome (ex: `orders-unpaid-{orgId}`). Quando o React reconcilia ou remonta, um `removeChannel` pode matar o canal do outro, causando a perda de atualizações ao vivo.

### Solução
Adicionar um sufixo único ao nome do canal Realtime dentro dos hooks, baseado num ID de instância (via `useId()` ou `useRef(crypto.randomUUID())`), para evitar conflitos entre múltiplas instâncias do mesmo hook.

### Alterações

**`src/hooks/useOrders.ts`**
- Nos hooks `useDeliveredUnpaidOrders` e `useAwaitingPaymentOrders`, gerar um ID de instância com `useRef` e usá-lo no nome do canal:
  - `orders-unpaid-${orgId}` → `orders-unpaid-${orgId}-${instanceId}`
  - `orders-awaiting-payment-${orgId}` → `orders-awaiting-payment-${orgId}-${instanceId}`
- O mesmo ajuste no hook `useOrders` principal se também for chamado por múltiplas instâncias

Isso garante que cada instância de WaiterTab mantém seu próprio canal Realtime sem interferência, e o `removeChannel` na desmontagem só remove o canal daquela instância.

### Resultado
O painel "Pagamento" receberá atualizações em tempo real normalmente, sem delay.

