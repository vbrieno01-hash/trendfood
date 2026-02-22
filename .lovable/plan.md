

# Corrigir impressao automatica para todos os tipos de pedido

## Problema identificado

O callback do Realtime (que escuta novos pedidos e dispara a impressao automatica) captura valores **desatualizados** das variaveis do React. O `useEffect` que cria o listener tem apenas `[orgId, qc]` como dependencias, entao:

- `btDevice` e sempre `null` no callback (era null quando o effect montou)
- `printMode`, `orgName`, `printerWidth`, `pixKey` sao todos valores antigos
- Se dois pedidos chegam em sequencia rapida, o segundo e descartado porque `isPrintingRef` ainda esta `true`

Isso explica por que pedidos de entrega (e potencialmente outros) nao imprimem automaticamente.

## Solucao

### 1. `src/pages/DashboardPage.tsx` — Usar refs para valores do callback

Criar refs para todas as variaveis usadas dentro do callback Realtime, garantindo que o callback sempre use os valores mais recentes sem precisar re-criar o listener:

```typescript
// Refs para valores usados no callback Realtime
const printModeRef = useRef(printMode);
const orgNameRef = useRef(orgName);
const printerWidthRef = useRef(printerWidth);
const pixKeyRef = useRef(pixKey);
const btDeviceRef = useRef(btDevice);

useEffect(() => { printModeRef.current = printMode; }, [printMode]);
useEffect(() => { orgNameRef.current = orgName; }, [orgName]);
useEffect(() => { printerWidthRef.current = printerWidth; }, [printerWidth]);
useEffect(() => { pixKeyRef.current = pixKey; }, [pixKey]);
useEffect(() => { btDeviceRef.current = btDevice; }, [btDevice]);
```

### 2. Callback Realtime — Usar refs em vez de variaveis diretas

No callback de auto-print, trocar todas as referencias diretas pelos `.current` das refs:

```typescript
await printOrderByMode(
  fullOrder,
  orgNameRef.current,
  printModeRef.current,
  orgId!,
  btDeviceRef.current,
  getPixPayload(fullOrder),
  printerWidthRef.current
);
```

### 3. Remover serializacao de `isPrintingRef`

Em vez de bloquear impressoes simultaneas com `isPrintingRef`, enfileirar os pedidos. Se chegar um segundo pedido enquanto o primeiro imprime, ele nao sera descartado:

```typescript
// Trocar bloqueio por fila sequencial
const printQueue = useRef<Array<() => Promise<void>>>([]);
const isProcessing = useRef(false);

const processQueue = async () => {
  if (isProcessing.current) return;
  isProcessing.current = true;
  while (printQueue.current.length > 0) {
    const job = printQueue.current.shift()!;
    try { await job(); } catch (err) {
      console.error("[Dashboard] Auto-print failed:", err);
    }
  }
  isProcessing.current = false;
};
```

### 4. `getPixPayload` tambem precisa de ref

A funcao `getPixPayload` usa `pixKey` do escopo externo. Atualizar para usar `pixKeyRef.current`.

## Arquivos alterados

- `src/pages/DashboardPage.tsx` — refs para valores do callback + fila de impressao

