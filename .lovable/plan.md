## Diagnóstico real (confirmado em produção — WrBurg)

Olhei a fila de impressão da WrBurg na última hora e encontrei pedidos com **6 jobs** distintos:

| Pedido | Jobs criados | Janela |
|---|---|---|
| `d8065ca3…` | 6 | 22:24 → 22:32 (8 min) |
| `4b1e1bbe…` | 5 | 22:56 → 23:00 (~4 min) |
| `59761504…` | 2 | 22:22 |

O índice único parcial (`status='pendente' AND order_id IS NOT NULL`) **não está segurando** porque cada job entra → o robô local imprime em ~5s → marca `status='impresso'` → o próximo INSERT passa pelo índice (o anterior já não está mais pendente). Ou seja, o índice só bloqueia inserts simultâneos, não bloqueia o ciclo "imprimi + alguém manda de novo".

E o que continua mandando são as fontes que a correção anterior **achou** ter neutralizado:

- **`printOrderByMode` modo `desktop`** continua chamando `enqueuePrint` (printOrder.ts:252). Foi mantido como "idempotente", mas só é idempotente se ainda houver job pendente.
- **DashboardPage / KitchenTab / KitchenPage** só pulam `printOrderByMode` quando `printMode === 'desktop' && !btDevice`. Se a lojista pareou alguma impressora BT em algum momento, `btDevice` pode estar truthy mesmo usando o cabo, então cai no `else` e chama `printOrderByMode` → enqueue.
- **`handlePrintOnly` manual** (botão "Imprimir" do KDS) chama `printOrderByMode` direto → mais 1 job. Provavelmente a lojista clicou várias vezes ou tem mais de um KDS aberto.
- **`KitchenPage` standalone** (linha 296 e 367) não tem o guard de modo desktop nenhum — qualquer KDS aberto numa segunda tela enfileira de novo.

Resultado: 1 INSERT canônico (`useOrders.placeOrder`) + N inserts dos listeners/botões = N+1 vias.

## Correção definitiva

Mudar a regra no banco e centralizar a lógica num único guard que serve pra todas as fontes.

### 1) Banco — índice único **forte** por order_id

Substituir o índice atual por um que cobre **qualquer status** (não só `pendente`). 1 pedido = 1 job, fim. Reimpressões manuais entram com `order_id = NULL` (livres do índice).

```sql
DROP INDEX IF EXISTS public.fila_impressao_one_pending_per_order;
CREATE UNIQUE INDEX fila_impressao_one_per_order
  ON public.fila_impressao (order_id)
  WHERE order_id IS NOT NULL;
```

Isso resolve o problema mesmo se o front falhar amanhã.

### 2) `enqueuePrint` continua idempotente em `23505`

Já está; só vai passar a engatilhar mais frequente, e isso é o comportamento desejado.

### 3) `printOrderByMode` — modo `desktop` nunca reenfileira pra pedido com id

Hoje sempre chama `enqueuePrint`. Passa a ser:

- Se `order.id` existe → **no-op** + toast "Enviado para impressão" (o robô já vai puxar o job criado no `placeOrder`).
- Se `order.id` não existe (PrinterTab teste) → enqueue normal.
- Adicionar parâmetro opcional `forceReprint?: boolean`. Quando `true`, faz INSERT **sem `order_id`** (driblando o índice) e prefixa o conteúdo com `*** 2ª VIA ***`. Usado só pelo botão manual.

### 4) `handlePrintOnly` (KitchenTab + KitchenPage) — usa `forceReprint`

A 2ª via vira um job sem `order_id`, claramente marcada. Não conflita com o índice e não é puxada por listener nenhum.

### 5) Remover os guards condicionais nos listeners

Como o `printOrderByMode` no modo desktop virou no-op, os blocos `if (printMode === 'desktop' && !btDevice) return;` em `DashboardPage`, `KitchenTab` e `KitchenPage` ficam redundantes — pode até deixar, mas o importante é que **mesmo se o guard falhar**, nada duplica mais.

### 6) `KitchenPage` standalone ganha o mesmo guard de modo desktop por consistência (defesa em profundidade).

## Arquivos afetados

- 1 migration nova (drop + create do índice)
- `src/lib/printOrder.ts` — guard no branch desktop + parâmetro `forceReprint`
- `src/components/dashboard/KitchenTab.tsx` — `handlePrintOnly` passa `forceReprint=true`
- `src/pages/KitchenPage.tsx` — mesmo, + adicionar guard de desktop nos listeners

## Resultado esperado (verificável)

Após aplicar, rodando essa query depois de alguns pedidos novos:

```sql
SELECT order_id, COUNT(*) FROM fila_impressao
WHERE organization_id = '28083a33-…' AND order_id IS NOT NULL
GROUP BY order_id HAVING COUNT(*) > 1;
```

deve retornar **0 linhas**. Cada pedido novo vira exatamente 1 cupom impresso. 2ª via só se a lojista clicar em "Imprimir" e confirmar — e sai com cabeçalho "2ª VIA".

Posso aplicar?