

# Corrigir auto-reconexao Bluetooth que nao conecta

## Problema

Ha um conflito de timeouts que impede a reconexao automatica:

1. `watchAdvertisements` espera ate 4 segundos
2. Se falhar, tenta `connectToDevice` que precisa de ate 10 segundos
3. Mas o timeout global e de apenas 6 segundos -- mata a conexao antes de completar
4. No `DashboardPage`, o `.catch` chama `clearStoredDevice()`, apagando o ID salvo -- na proxima recarga, o sistema nem tenta reconectar

## Solucao

### 1. `src/lib/bluetoothPrinter.ts`

- Reduzir timeout do `watchAdvertisements` de 4s para 2s (deixar mais tempo para o GATT connect)
- Aumentar o timeout global de 6s para 15s (tempo suficiente para watchAdv 2s + GATT connect 10s)

### 2. `src/pages/DashboardPage.tsx`

- Remover `clearStoredDevice()` do `.catch` -- nao deve apagar o pareamento salvo so porque uma tentativa falhou (a impressora pode estar desligada agora mas ligada na proxima vez)
- Manter apenas o `console.warn` para debug

## Detalhes tecnicos

### bluetoothPrinter.ts

```typescript
// watchAdvertisements: 4s -> 2s
setTimeout(() => {
  reject(new Error("watchAdvertisements timeout (2s)"));
}, 2000);

// Global timeout: 6s -> 15s
return withTimeout(reconnectStoredPrinterInternal(storedId), 15000, "reconnectStoredPrinter")
```

### DashboardPage.tsx

```typescript
.catch((err) => {
  console.warn("[BT] Auto-reconnect failed on mount:", err);
  // NAO limpar o device -- pode funcionar no proximo reload
});
```

## Arquivos alterados
- `src/lib/bluetoothPrinter.ts` -- ajustar timeouts
- `src/pages/DashboardPage.tsx` -- remover clearStoredDevice do catch

