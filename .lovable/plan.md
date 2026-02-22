

# Corrigir travamento do Chrome ao recarregar com impressora offline

## Problema raiz

A funcao `reconnectStoredPrinterInternal` chama `await (device).watchAdvertisements()` (linha 272). Essa chamada da Web Bluetooth API pode **travar a thread principal do Chrome** quando o adaptador Bluetooth esta em estado inconsistente ou a impressora esta desligada. O `withTimeout` global de 15s nao ajuda porque o travamento acontece **dentro** da chamada sincrona do navegador, antes mesmo do event loop processar o timeout.

## Solucao

Remover completamente o bloco `watchAdvertisements` da funcao `reconnectStoredPrinterInternal`. Ir direto para `connectToDevice(device)` que ja possui timeout interno de 10s via `withTimeout` no GATT connect. Isso e seguro porque:

- `connectToDevice` ja tenta conectar ao GATT com timeout de 10s
- Se a impressora estiver desligada, o GATT connect falha normalmente sem travar o navegador
- `watchAdvertisements` era apenas uma otimizacao para detectar se a impressora esta por perto, mas causa mais problemas do que resolve

Tambem reduzir o timeout global de 15s para 12s (suficiente para o GATT connect de 10s + margem).

## Alteracoes

### `src/lib/bluetoothPrinter.ts`

Na funcao `reconnectStoredPrinterInternal`, remover todo o bloco de `watchAdvertisements` (linhas 269-289) e manter apenas a chamada direta a `connectToDevice`:

```typescript
async function reconnectStoredPrinterInternal(storedId: string): Promise<BluetoothDevice | null> {
  try {
    const bt = navigator as any;
    if (typeof bt.bluetooth?.getDevices !== "function") {
      console.log("[BT] getDevices() not supported in this browser");
      return null;
    }

    const devices: BluetoothDevice[] = await bt.bluetooth.getDevices();
    const device = devices.find((d) => d.id === storedId);
    if (!device) {
      console.log("[BT] Stored device not found among authorized devices");
      return null;
    }

    // Conectar direto ao GATT (connectToDevice ja tem timeout interno de 10s)
    // NAO usar watchAdvertisements — pode travar o Chrome completamente
    const char = await connectToDevice(device);
    if (char) {
      console.log("[BT] Auto-reconnected to", device.name || device.id);
      return device;
    }

    return null;
  } catch (err) {
    console.warn("[BT] Auto-reconnect internal error:", err);
    return null;
  }
}
```

Tambem alterar o timeout global de 15000 para 12000.

## Arquivos alterados

- `src/lib/bluetoothPrinter.ts` — remover `watchAdvertisements`, reduzir timeout global

