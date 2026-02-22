

# Corrigir travamento ao recarregar pagina sem impressora pareada

## Problema

Quando a pagina recarrega e existe um `bt_printer_device_id` salvo no localStorage (de um pareamento anterior), o sistema tenta reconectar automaticamente chamando `reconnectStoredPrinter()`. Essa funcao usa `watchAdvertisements()` para esperar o dispositivo ficar visivel antes de conectar. Quando a impressora esta desligada ou fora de alcance, `watchAdvertisements()` pode travar o navegador completamente (bug conhecido da API Web Bluetooth no Chrome).

## Solucao

### 1. `src/lib/bluetoothPrinter.ts` — Tornar reconnect seguro

- Envolver toda a logica de `reconnectStoredPrinter()` com um timeout global de 6 segundos — se nao reconectar nesse tempo, retorna `null` silenciosamente
- Tratar qualquer erro de `watchAdvertisements` de forma que nunca bloqueie a thread principal
- Se `watchAdvertisements` nao estiver disponivel, tentar conectar direto ao GATT (com timeout) em vez de desistir

### 2. `src/pages/DashboardPage.tsx` — Proteger o useEffect de auto-reconnect

- Adicionar try-catch robusto ao redor da chamada `reconnectStoredPrinter()`
- Se falhar, limpar o device ID armazenado para evitar travamento em recarregamentos futuros
- Log de aviso para facilitar debug

## Detalhes tecnicos

### `reconnectStoredPrinter` — timeout global

```typescript
export async function reconnectStoredPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothSupported()) return null;
  const storedId = getStoredDeviceId();
  if (!storedId) return null;

  // Timeout global para evitar travamento do navegador
  return withTimeout(reconnectStoredPrinterInternal(storedId), 6000, "reconnectStoredPrinter")
    .catch(() => {
      console.warn("[BT] Auto-reconnect timed out or failed");
      return null;
    });
}

async function reconnectStoredPrinterInternal(storedId: string): Promise<BluetoothDevice | null> {
  // ... logica atual movida para ca ...
}
```

### `DashboardPage.tsx` — useEffect defensivo

```typescript
useEffect(() => {
  if (btDevice) return;
  if (!isBluetoothSupported()) return;
  let cancelled = false;
  reconnectStoredPrinter()
    .then((device) => {
      if (cancelled || !device) return;
      setBtDevice(device);
      setBtConnected(true);
      toast.success("Impressora reconectada automaticamente");
      attachDisconnectHandler(device);
    })
    .catch((err) => {
      console.warn("[BT] Auto-reconnect failed on mount:", err);
      // Limpar device armazenado para evitar travamento em futuros reloads
      clearStoredDevice();
    });
  return () => { cancelled = true; };
}, [organization]);
```

## Arquivos alterados
- `src/lib/bluetoothPrinter.ts` — timeout global no `reconnectStoredPrinter`, refatorar logica interna
- `src/pages/DashboardPage.tsx` — catch defensivo no useEffect + limpar device se falhar

