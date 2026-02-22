

# Reconexao automatica com impressora Bluetooth apos reload/publicacao

## Problema
Apos publicar o site (ou recarregar a pagina), o estado `btDevice` do React e perdido. O Web Bluetooth exige um gesto do usuario para parear novamente via `requestDevice()`. Porem, o Chrome oferece `navigator.bluetooth.getDevices()` que permite reconectar com dispositivos previamente pareados sem popup.

## Solucao
Adicionar funcao `reconnectStoredPrinter()` que tenta reconectar automaticamente ao abrir a pagina, usando o device ID salvo no localStorage.

## Mudancas

### 1. `src/lib/bluetoothPrinter.ts` — Nova funcao `reconnectStoredPrinter()`

```text
export async function reconnectStoredPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothSupported()) return null;
  const storedId = getStoredDeviceId();
  if (!storedId) return null;

  try {
    const devices = await (navigator as any).bluetooth.getDevices();
    const device = devices.find((d: BluetoothDevice) => d.id === storedId);
    if (!device) return null;

    // Pre-connect to validate the device is reachable
    const char = await connectToDevice(device);
    if (char) return device;

    return null;
  } catch (err) {
    console.warn("[BT] Auto-reconnect failed:", err);
    return null;
  }
}
```

### 2. `src/pages/KitchenPage.tsx` — useEffect de reconexao automatica
Ao montar o componente, se `printMode === "bluetooth"` e `btDevice` e nulo, chamar `reconnectStoredPrinter()`. Se retornar um device, setar no estado.

### 3. `src/pages/DashboardPage.tsx` — Mesmo useEffect de reconexao
Replicar a mesma logica no DashboardPage (que compartilha o estado BT com KitchenTab).

### 4. Toast informativo
Se a reconexao automatica falhar, nao mostrar erro (silencioso). Se funcionar, mostrar toast discreto: "Impressora reconectada automaticamente".

## Nota tecnica
`navigator.bluetooth.getDevices()` so funciona em Chrome 85+ e requer que o usuario tenha pareado pelo menos uma vez na mesma origem. Por isso o fallback para pareamento manual continua existindo.

## Arquivos alterados
- `src/lib/bluetoothPrinter.ts` (nova funcao)
- `src/pages/KitchenPage.tsx` (useEffect de reconexao)
- `src/pages/DashboardPage.tsx` (useEffect de reconexao)
