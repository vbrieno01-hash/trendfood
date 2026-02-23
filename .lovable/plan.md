

## Correção: Impressão duplicada no APK

### Causa raiz

Existem **dois caminhos de impressão** disparando para o mesmo pedido:

1. **`usePlaceOrder`** (useOrders.ts): Sempre chama `enqueuePrint()` ao criar um pedido, inserindo na tabela `fila_impressao`
2. **Callback Realtime** (DashboardPage): Detecta o INSERT e chama `printOrderByMode()`, que imprime **diretamente via BLE nativo**

Depois, o **polling de 10s** no DashboardPage encontra o registro na `fila_impressao` (inserido pelo passo 1) e imprime **de novo**.

Resultado: impressao direta + impressao da fila = duplicado.

### Solucao

Modificar `printOrderByMode` em `src/lib/printOrder.ts` para que, quando a impressao nativa BLE tiver sucesso, ele **nao caia no fallback** de `enqueuePrint`. Isso ja esta correto (tem `return` apos sucesso).

O problema real e que o `usePlaceOrder` **sempre** enfileira, independente do auto-print. Precisamos de uma das duas abordagens:

**Abordagem escolhida: Nao enfileirar quando estiver em plataforma nativa com auto-print ativo**

#### 1. `src/hooks/useOrders.ts` -- Condicionar o enqueue

Adicionar um parametro opcional `skipQueue` ao `usePlaceOrder`. Quando o DashboardPage sabe que vai auto-imprimir via Realtime, passa `skipQueue: true` para evitar a insercao duplicada na fila.

Alternativa mais simples: verificar se estamos em plataforma nativa antes de enfileirar. Se sim, pular o enqueue porque o Realtime vai cuidar da impressao direta.

```typescript
// Em usePlaceOrder, apos criar o pedido:
const isNative = (() => {
  try {
    const { Capacitor } = require("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch { return false; }
})();

// So enfileira se NAO for nativo (no nativo, o Realtime imprime direto)
if (!isNative) {
  const text = stripFormatMarkers(formatReceiptText(printableOrder));
  await enqueuePrint(organizationId, order.id, text);
}
```

#### 2. `src/lib/printOrder.ts` -- Nao enfileirar apos sucesso nativo (seguranca)

O codigo atual ja faz `return` apos sucesso nativo, entao nao precisa de mudanca aqui. Mas como seguranca extra, garantir que o bloco de fallback `enqueuePrint` no final do modo bluetooth so rode se NAO estivermos em plataforma nativa com sucesso.

### Detalhes tecnicos

**useOrders.ts** -- Dentro do `mutationFn` do `usePlaceOrder`, envolver o bloco de `enqueuePrint` (linhas 195-213) com uma verificacao de plataforma nativa:

```typescript
// Antes: sempre enfileira
// Depois: so enfileira se nao for nativo
let skipQueue = false;
try {
  const { Capacitor } = await import("@capacitor/core");
  skipQueue = Capacitor.isNativePlatform();
} catch {}

if (!skipQueue) {
  try {
    const printableOrder = { ... };
    const text = stripFormatMarkers(formatReceiptText(printableOrder));
    await enqueuePrint(organizationId, order.id, text);
  } catch (err) {
    console.error("Falha ao enfileirar impressão:", err);
  }
}
```

Isso garante que:
- **No APK**: o Realtime imprime direto via BLE, sem nada na fila = sem duplicado
- **Na web**: o `enqueuePrint` continua funcionando normalmente para o robo desktop
- **Se o Realtime falhar no APK**: o polling nao vai encontrar nada na fila, mas o usuario pode reimprimir manualmente

### Resultado esperado

- Apenas UMA impressao por pedido no APK
- Comportamento web inalterado (fila desktop continua funcionando)
- Nenhuma mudanca na edge function printer-queue

