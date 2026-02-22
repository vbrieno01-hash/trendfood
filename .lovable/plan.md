
# Melhorar resiliencia da impressao Bluetooth (retry automatico)

## Problema
A impressao Bluetooth esta falhando e caindo direto pro fallback da fila ("Bluetooth falhou, salvando na fila..."). Isso acontece porque o `sendToBluetoothPrinter` tenta conectar uma unica vez e, se falhar (timeout, desconexao momentanea), desiste imediatamente.

## Solucao
Adicionar logica de retry com reconexao automatica no `sendToBluetoothPrinter`, tentando ate 2 vezes antes de cair pro fallback.

## Mudancas

### 1. `src/lib/bluetoothPrinter.ts` - Retry na funcao `sendToBluetoothPrinter`
- Envolver a logica de envio em um loop de ate 2 tentativas (total)
- Na primeira falha de escrita, limpar o cache (`cachedCharacteristic = null`, `cachedServer = null`) e tentar reconectar antes de desistir
- Adicionar log `[BT] Retry attempt...` para debug

### 2. `src/lib/bluetoothPrinter.ts` - Aumentar timeout do GATT connect
- Aumentar o timeout de `gatt.connect()` de 5s para 8s, pois impressoras termicas Bluetooth costumam ser lentas na reconexao

### 3. `src/lib/printOrder.ts` - Toast mais informativo no fallback
- Quando o Bluetooth falha mesmo apos retry, mostrar toast com `description` orientando: "Verifique se a impressora esta ligada e proxima"

## Detalhes tecnicos

Estrutura do retry em `sendToBluetoothPrinter`:

```text
export async function sendToBluetoothPrinter(device, text): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let characteristic = cachedCharacteristic;
      if (!characteristic || !cachedServer?.connected) {
        characteristic = await connectToDevice(device);
      }
      if (!characteristic) throw new Error("No writable characteristic");
      
      // ... enviar chunks (logica existente) ...
      return true;
    } catch (err) {
      console.error(`[BT] Attempt ${attempt + 1} failed:`, err);
      cachedCharacteristic = null;
      cachedServer = null;
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 500)); // pequeno delay antes do retry
      }
    }
  }
  return false;
}
```

No `printOrder.ts`, linha 336:
```text
toast.warning("Bluetooth falhou, salvando na fila...", {
  description: "Verifique se a impressora está ligada e próxima.",
});
```

## Ambito
Essas mudancas sao nos modulos compartilhados (`src/lib/`), entao valem automaticamente para **todas** as telas: KitchenTab, KitchenPage, DashboardPage, e qualquer outro lugar que use `printOrderByMode`.
