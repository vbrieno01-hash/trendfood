

# Corrigir reconexao automatica Bluetooth ao recarregar pagina

## Problema raiz

O `reconnectStoredPrinter()` chama `getDevices()` e tenta `device.gatt.connect()` imediatamente. Porem, o Chrome exige que o dispositivo esteja "visivel" antes de conectar. Para isso, e necessario chamar `device.watchAdvertisements()` e aguardar o evento `advertisementreceived` antes de tentar o GATT connect. Sem isso, a conexao falha silenciosamente.

## Solucao

### `src/lib/bluetoothPrinter.ts` — Usar watchAdvertisements antes de conectar

Modificar `reconnectStoredPrinter()` para:

1. Obter o device via `getDevices()`
2. Chamar `device.watchAdvertisements()` (se disponivel)
3. Aguardar o evento `advertisementreceived` (com timeout de 8 segundos)
4. Somente entao chamar `connectToDevice(device)`
5. Se `watchAdvertisements` nao estiver disponivel no browser, tentar o connect direto como fallback

```text
getDevices() -> encontra device
   |
   v
device.watchAdvertisements()
   |
   v
Aguarda "advertisementreceived" (max 8s)
   |
   v
connectToDevice(device) -> GATT connect + discover services
   |
   v
Retorna device conectado
```

### Codigo da mudanca principal (reconnectStoredPrinter)

```typescript
// Dentro de reconnectStoredPrinter, apos encontrar o device:
if (typeof device.watchAdvertisements === "function") {
  await device.watchAdvertisements();
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      device.removeEventListener("advertisementreceived", onAdv);
      reject(new Error("watchAdvertisements timeout"));
    }, 8000);
    const onAdv = () => {
      clearTimeout(timeout);
      device.removeEventListener("advertisementreceived", onAdv);
      resolve();
    };
    device.addEventListener("advertisementreceived", onAdv);
  });
}
// Agora sim conectar
const char = await connectToDevice(device);
```

### Fallback para browsers sem watchAdvertisements

Se `watchAdvertisements` nao existir, tenta o connect direto (comportamento atual) — nao quebra nada.

## Arquivo alterado
- `src/lib/bluetoothPrinter.ts` — modificar `reconnectStoredPrinter()` para usar `watchAdvertisements` antes do GATT connect

