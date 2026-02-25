

# Plano: Tornar pedidos e baixas instantâneos (Realtime otimizado)

## Diagnóstico

Identifiquei **3 causas raiz** para a lentidão:

1. **`staleTime: 30_000` global** (App.tsx linha 31) — O React Query considera os dados "frescos" por 30 segundos. Quando o Realtime dispara `invalidateQueries`, a query é marcada como stale mas pode haver atraso no refetch se o componente não estiver montado/ativo.

2. **Canais Realtime duplicados** — O hook `useOrders` já cria uma subscription Realtime interna. Mas `KitchenTab`, `KitchenPage` e `DashboardPage` criam **canais adicionais** para a mesma tabela. Isso cria concorrência de invalidações e desperdício de conexões WebSocket.

3. **Subscription de `order_items` sem filtro** — No `useOrders` (linha 134-139), o hook escuta `order_items` **de toda a plataforma** sem filtrar por organização. Cada mudança em qualquer pedido de qualquer lojista dispara um refetch para todos.

## O que será feito

### 1. Reduzir `staleTime` para dados operacionais
- `App.tsx`: baixar `staleTime` global para `5_000` (5s) para garantir refetch rápido
- Hooks de pedidos (`useOrders`, `useDeliveredUnpaidOrders`, `useAwaitingPaymentOrders`): definir `staleTime: 0` explicitamente para que qualquer invalidação dispare refetch imediato

### 2. Eliminar canais Realtime duplicados
- **`KitchenTab.tsx`**: remover o `useEffect` com canal Realtime (linhas 115-129) — o `useOrders` já faz isso internamente
- **`KitchenPage.tsx`**: simplificar o canal Realtime para focar apenas na lógica de bell/notificações/auto-print (INSERT), removendo o listener de UPDATE que já é coberto pelo `useOrders`
- **`DashboardPage.tsx`**: manter apenas a lógica de bell/notificações no canal INSERT, sem duplicar invalidação

### 3. Otimizar subscription de `order_items`
- No `useOrders`, remover a subscription global de `order_items` (que escuta todos os order_items de toda a plataforma)
- Em vez disso, quando um evento de `orders` chega, o refetch de `orders` com `select("*, order_items(*)")` já traz os items atualizados

### 4. Refetch imediato após mutações (baixas)
- No `useUpdateOrderStatus`, adicionar `await qc.refetchQueries(...)` no `onSuccess` em vez de apenas `invalidateQueries` — isso força o refetch instantâneo ao dar baixa
- No `useMarkAsPaid` e `useConfirmPixPayment`, mesma estratégia

### 5. Adicionar `refetchOnWindowFocus: true` para pedidos
- Garante que ao retornar à aba do navegador, os pedidos são atualizados imediatamente

## Seção técnica

```text
Arquivo 1: src/App.tsx (linha 31)
  staleTime: 30_000  →  staleTime: 5_000

Arquivo 2: src/hooks/useOrders.ts
  - useOrders: adicionar staleTime: 0, refetchOnWindowFocus: true
  - Remover subscription de order_items (linhas 134-139)
  - useUpdateOrderStatus.onSuccess: trocar invalidateQueries por refetchQueries
  - useMarkAsPaid.onSuccess: trocar invalidateQueries por refetchQueries
  - useConfirmPixPayment.onSuccess: trocar invalidateQueries por refetchQueries
  - useDeliveredUnpaidOrders: adicionar staleTime: 0
  - useAwaitingPaymentOrders: adicionar staleTime: 0

Arquivo 3: src/components/dashboard/KitchenTab.tsx
  - Remover useEffect do canal Realtime (linhas 115-129) — já existe dentro de useOrders
  - Remover import de supabase e useQueryClient (se não usados em outro lugar)

Arquivo 4: src/pages/KitchenPage.tsx
  - Canal Realtime: manter apenas INSERT para bell/notificação/auto-print
  - Remover listener de UPDATE (linhas 234-240) — coberto por useOrders

Arquivo 5: src/pages/DashboardPage.tsx
  - Canal Realtime: manter apenas INSERT para bell/notificação/auto-print
  - Remover invalidateQueries duplicado do canal (já feito pelo useOrders)
```

Resultado esperado: pedidos aparecem instantaneamente e baixas refletem em < 1 segundo em todas as telas simultaneamente.

