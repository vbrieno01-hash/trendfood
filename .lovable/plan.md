

## Correção: Impressão instantânea no APK (eliminar delay de 10s)

### Causa raiz

O callback Realtime no DashboardPage faz isso:

1. Chama `ensureNativeConnection()` -- reconecta o BLE nativo OK
2. Verifica `btDeviceRef.current || getStoredDeviceId()` -- detecta modo "bluetooth" OK
3. Chama `printOrderByMode(... btDeviceRef.current ...)` -- mas `btDeviceRef.current` e NULL!
4. Dentro de `printOrderByMode`, modo "bluetooth" com `btDevice = null` vai direto pro fallback: `enqueuePrint()` (fila)
5. O polling de 10 segundos encontra o pedido na fila e imprime -- causando o delay

O problema: `ensureNativeConnection()` reconecta o BLE nativo, mas ninguem atualiza `btDeviceRef.current` com um objeto fake compativel.

### Solucao

Duas mudancas complementares:

#### 1. `src/pages/DashboardPage.tsx` -- Atualizar btDeviceRef apos reconexao nativa

No callback Realtime, apos `ensureNativeConnection()` com sucesso, criar um objeto fake e atualizar `btDeviceRef.current`:

```typescript
if (isNativePlatform()) {
  try {
    const native = await import("@/lib/nativeBluetooth");
    await native.ensureNativeConnection();
    if (native.isNativeConnected() && !btDeviceRef.current) {
      // Criar fake device para que printOrderByMode use o path bluetooth
      const fakeDevice = { id: native.getNativeStoredDeviceId(), name: "Native BLE", gatt: { connected: true } } as any;
      btDeviceRef.current = fakeDevice;
    }
  } catch (err) {
    console.warn("[AutoPrint] Native BLE ensure failed:", err);
  }
}
```

#### 2. `src/lib/printOrder.ts` -- Path direto nativo quando btDevice e null

Como seguranca extra, no `printOrderByMode`, quando o modo e "bluetooth" e `btDevice` e null mas estamos em plataforma nativa com device armazenado, chamar `sendToNativePrinter` diretamente:

```typescript
if (printMode === "bluetooth") {
  // Native platform: try direct native print even without btDevice object
  if (isNativePlatform()) {
    try {
      const native = await import("@/lib/nativeBluetooth");
      await native.ensureNativeConnection();
      if (native.isNativeConnected()) {
        const success = await native.sendToNativePrinter(text);
        if (success) {
          toast.success("Impresso via Bluetooth");
          return;
        }
      }
    } catch (err) {
      console.warn("[PrintOrder] Native direct print failed:", err);
    }
  }
  
  // Web path: usa btDevice normalmente
  if (btDevice) {
    const success = await sendToBluetoothPrinter(btDevice, text);
    if (success) {
      toast.success("Impresso via Bluetooth");
      return;
    }
    // ...fallback...
  }
  // ...fallback to queue...
}
```

### Detalhes tecnicos

**DashboardPage.tsx** -- Linhas ~190-197 do callback Realtime: apos `ensureNativeConnection()`, adicionar atualizacao do `btDeviceRef.current` com fake device quando conectado.

**printOrder.ts** -- No bloco `if (printMode === "bluetooth")`: adicionar verificacao `isNativePlatform()` antes do check de `btDevice`, chamando `sendToNativePrinter` diretamente. Isso garante que mesmo se o fake device nao foi criado, a impressao nativa funciona.

### Resultado esperado

- Impressao instantanea no APK (sem delay de 10s)
- O polling de 10s continua como fallback de seguranca
- Nenhuma mudanca no comportamento web
