
## Correção: Impressão automática inconsistente entre contas

### Diagnóstico

O problema é que na última correção de duplicação, fizemos o `usePlaceOrder` **pular a fila de impressão** (`fila_impressao`) no APK nativo. Isso criou uma dependência total no Realtime callback do DashboardPage para imprimir. Se o Realtime falhar, atrasar, ou o Bluetooth desconectar silenciosamente, **não há fallback** — o pedido simplesmente não imprime.

A conta "Julia" funciona porque a conexão BLE está estável. A conta "Rei do Burguer" provavelmente perde a conexão BLE em algum momento, o Realtime tenta imprimir, falha silenciosamente, e como a fila está vazia (não enfileirou), o polling de 10s também não encontra nada. Resultado: tem que ficar na cozinha imprimindo manual.

### Solução: Sempre enfileirar + deduplicar no auto-print

Em vez de pular a fila no APK, vamos **sempre enfileirar** (reverter a última mudança) e fazer o **auto-print via Realtime marcar o job como impresso** quando tiver sucesso. Assim:

- Se o Realtime imprime com sucesso via BLE → marca o job na fila como "impresso" → polling não reimprime
- Se o Realtime falha (BLE caiu) → job continua "pendente" na fila → polling de 10s imprime como fallback

### Mudanças técnicas

#### 1. `src/hooks/useOrders.ts` — Reverter skip do enqueue

Remover a verificação de `Capacitor.isNativePlatform()` e voltar a **sempre enfileirar**. Isso garante que a `fila_impressao` sempre tenha o job como rede de segurança.

```typescript
// ANTES (atual - problemático):
let skipQueue = false;
try {
  const { Capacitor } = await import("@capacitor/core");
  skipQueue = Capacitor.isNativePlatform();
} catch {}
if (!skipQueue) { ... enqueuePrint ... }

// DEPOIS (corrigido):
// Sempre enfileira, independente da plataforma
try {
  const printableOrder = { ... };
  const text = stripFormatMarkers(formatReceiptText(printableOrder));
  await enqueuePrint(organizationId, order.id, text);
} catch (err) {
  console.error("Falha ao enfileirar impressão:", err);
}
```

#### 2. `src/pages/DashboardPage.tsx` — Auto-print marca job como impresso

No callback Realtime de auto-print (dentro do `printQueue.push`), após imprimir com sucesso via BLE, buscar e marcar o job correspondente na `fila_impressao` como "impresso". Isso evita que o polling de 10s reimprima.

```typescript
// Após printOrderByMode com sucesso:
try {
  await supabase
    .from("fila_impressao")
    .update({ status: "impresso", printed_at: new Date().toISOString() })
    .eq("order_id", order.id)
    .eq("organization_id", orgId)
    .eq("status", "pendente");
} catch {}
```

### Resultado esperado

- **Todas as contas**: impressão automática funciona de forma confiável
- **BLE estável**: Realtime imprime + marca fila = sem duplicado
- **BLE instável**: Realtime falha + polling de 10s pega da fila = fallback automático
- **Web (browser)**: continua igual — sempre enfileira para o robô desktop
- Nenhum cliente precisa mexer em configuração
