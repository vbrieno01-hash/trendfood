

# Melhorar reconexao automatica Bluetooth no carregamento

## Problema

A reconexao automatica depende de `watchAdvertisements()` para tornar o dispositivo visivel ao Chrome antes de tentar conectar via GATT. Mas essa API tem limitacoes:
- Nem todos os navegadores/versoes suportam
- A impressora precisa estar ativamente anunciando no momento exato (janela de 4 segundos)
- Se a impressora demorar para anunciar ou o browser nao captar, a conexao falha silenciosamente

Depois disso, o backoff retry tenta `connectToDevice` mais 3 vezes (1s, 2s, 4s), mas tambem depende do dispositivo estar visivel.

## Solucao

Duas mudancas na estrategia de reconexao:

### 1. Tentar conexao GATT direta primeiro (sem esperar advertisement)

Muitos dispositivos Bluetooth permitem reconexao direta via `device.gatt.connect()` sem precisar de `watchAdvertisements`. Adicionar um "fast path" que tenta conectar diretamente antes de recorrer ao `watchAdvertisements`.

### 2. Aumentar retentativas e timeouts

- `waitForAdvertisement`: aumentar de 4s para 6s
- Backoff retry: aumentar de 3 para 5 tentativas (1s, 2s, 4s, 8s, 16s)
- Timeout global de `reconnectStoredPrinter`: aumentar de 12s para 20s

## Alteracoes tecnicas

### `src/lib/bluetoothPrinter.ts`

**reconnectStoredPrinterInternal** -- adicionar tentativa direta antes de watchAdvertisements:

```typescript
async function reconnectStoredPrinterInternal(storedId: string): Promise<BluetoothDevice | null> {
  const bt = navigator as any;
  if (typeof bt.bluetooth?.getDevices !== "function") return null;

  const devices = await bt.bluetooth.getDevices();
  const device = devices.find((d) => d.id === storedId);
  if (!device) return null;

  // Fast path: tentar GATT connect direto (funciona em muitos dispositivos)
  try {
    console.log("[BT] Tentando conexao direta...");
    const char = await connectToDevice(device);
    if (char) {
      console.log("[BT] Conexao direta OK:", device.name || device.id);
      return device;
    }
  } catch { /* continua para watchAdvertisements */ }

  // Slow path: watchAdvertisements + retry
  await waitForAdvertisement(device, 6000);
  const char = await connectToDevice(device);
  if (char) return device;

  return null;
}
```

**reconnectStoredPrinter** -- aumentar timeout global para 20s

**waitForAdvertisement** -- timeout padrao para 6s

### `src/pages/DashboardPage.tsx`

**Backoff retry** -- aumentar para 5 tentativas:

```typescript
autoReconnect(target, onConnected, onFailed, 5);
```

## Arquivos alterados

- `src/lib/bluetoothPrinter.ts` -- fast path direto + timeouts maiores
- `src/pages/DashboardPage.tsx` -- mais tentativas de backoff

