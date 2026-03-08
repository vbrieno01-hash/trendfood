

## Plano: Delivery só aparece para motoboy quando pedido estiver "Pronto"

### Problema
`createDeliveryForOrder` é chamada em **dois lugares** em ambos os arquivos (`KitchenTab.tsx` e `KitchenPage.tsx`):
1. `handleAcceptOrder` (primeiro clique — `pending` → `preparing`) — **não deveria criar delivery**
2. `handleUpdateStatus` com `status === "ready"` (segundo clique — `preparing` → `ready`) — **correto**

### Solução
Remover a chamada `createDeliveryForOrder` de dentro de `handleAcceptOrder` nos dois arquivos. A delivery só será criada quando o status mudar para `"ready"`.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/KitchenTab.tsx` | Remover `createDeliveryForOrder` do `handleAcceptOrder` (linhas ~201-203) |
| `src/pages/KitchenPage.tsx` | Remover `createDeliveryForOrder` do `handleAcceptOrder` (linhas ~256-258) |

Mudança mínima — apenas deletar 3 linhas em cada arquivo.

