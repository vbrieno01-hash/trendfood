## Problema: impressora a cabo imprimindo várias vias do mesmo pedido

### Causa raiz (3 fontes inserindo o mesmo job)

No modo `desktop` (impressora a cabo via robô local que lê `fila_impressao`), o **mesmo pedido** está sendo enfileirado **3+ vezes**:

1. **`useOrders.placeOrder`** (linha 255) — sempre enfileira ao criar o pedido. ✅ Correto, é o fallback canônico.
2. **`DashboardPage` auto-print** (linha 285) — quando o Realtime dispara, chama `printOrderByMode(..., 'desktop', ...)` que internamente faz `enqueuePrint` de novo (printOrder.ts:249). ❌ Duplicata.
3. **`KitchenTab` / `KitchenPage` auto-print** (KitchenTab.tsx:314, KitchenPage.tsx:361) — mesma coisa, se o lojista tiver KDS aberto em outra aba/dispositivo. ❌ Duplicata por aba aberta.
4. Botão **"Imprimir manual"** também chama `printOrderByMode` em desktop → mais um job, mesmo se já impresso.

O `mark as impresso` no DashboardPage (linha 297) só ajuda parcialmente — o robô já pode ter puxado um job antes do mark, e cada KDS extra aberto cria sua própria cópia antes do mark global.

### Solução: 1 pedido = 1 job, com trava no banco

Mudanças mínimas e à prova de race condition:

**1. Banco — índice único parcial em `fila_impressao`**

```sql
-- Garante que só pode existir 1 job pendente por pedido
CREATE UNIQUE INDEX IF NOT EXISTS fila_impressao_one_pending_per_order
  ON public.fila_impressao (order_id)
  WHERE status = 'pendente' AND order_id IS NOT NULL;
```

Qualquer `INSERT` duplicado vira erro de constraint → fica como segurança final mesmo se o front errar.

**2. `src/lib/printQueue.ts` — `enqueuePrint` idempotente**

Capturar erro de unique violation (código `23505`) e ignorar silenciosamente. Mantém comportamento normal pra outros erros.

**3. `src/lib/printOrder.ts` — não reenfileirar no modo desktop**

No `printOrderByMode`, quando `printMode === 'desktop'` **e** `order.id` existir, **não chamar `enqueuePrint`** (a fila já foi criada no `placeOrder`). Só mostrar toast “Enviado para impressão”. Para casos sem `order.id` (ex: teste de impressão da `PrinterTab`), mantém o enqueue.

**4. Auto-print do Dashboard / KitchenTab / KitchenPage — pular no modo desktop**

Nos 3 listeners de Realtime que fazem auto-print, adicionar guard:

```ts
if (printMode === 'desktop') {
  // Nada a fazer: o robô já vai puxar o job criado pelo placeOrder.
  return;
}
```

Bluetooth e browser continuam passando pelo auto-print normalmente.

**5. Manual “Imprimir” no modo desktop — pedir confirmação reforçada e enviar como 2ª via marcada**

No `handlePrintOnly` do `KitchenTab`/`KitchenPage`, no modo desktop a 2ª via passa a inserir um **novo** job (sem order_id, conteúdo com cabeçalho “2ª VIA”) — não conflita com o índice único e é claramente uma reimpressão pedida pelo lojista.

### Arquivos afetados

- 1 migration nova (índice único parcial)
- `src/lib/printQueue.ts` — try/catch para 23505 (~5 linhas)
- `src/lib/printOrder.ts` — guard no branch desktop (~5 linhas)
- `src/pages/DashboardPage.tsx` — guard `if (printMode === 'desktop') return` no auto-print (~3 linhas)
- `src/components/dashboard/KitchenTab.tsx` — mesmo guard (~3 linhas)
- `src/pages/KitchenPage.tsx` — mesmo guard (~3 linhas)
- `handlePrintOnly` (Kitchen*) — branch 2ª via no modo desktop (~10 linhas)

### Resultado esperado

- Cabo imprime **exatamente 1 via** por pedido novo, independente de quantas abas/dispositivos estejam abertos.
- 2ª via só sai se o lojista clicar manualmente em “Imprimir” e confirmar.
- Bluetooth e browser continuam funcionando exatamente como hoje.
- Índice único garante a regra mesmo se algum bug futuro tentar enfileirar duas vezes.

Quer que eu aplique?