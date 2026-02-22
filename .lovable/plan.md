

# Reconexao automatica Bluetooth apos desconexao

## Problemas identificados

1. **Desconecta ao imprimir**: Quando um pedido e gerado, o evento `gattserverdisconnected` dispara (impressoras termicas BLE frequentemente desconectam apos inatividade ou durante transferencia pesada). O listener atual apenas seta `btConnected = false` sem tentar reconectar.

2. **Nao reconecta sozinha**: O `reconnectStoredPrinter()` so roda uma vez no mount e depende de `navigator.bluetooth.getDevices()` que pode falhar silenciosamente. Alem disso, nao ha nenhuma logica de reconexao apos uma desconexao inesperada.

## Solucao

### 1. `src/lib/bluetoothPrinter.ts` — Adicionar funcao de reconexao resiliente

- Criar `autoReconnect(device, onConnected, onFailed)` que:
  - Tenta reconectar ate 3 vezes com delay crescente (1s, 2s, 4s)
  - Chama `connectToDevice(device)` em cada tentativa
  - Retorna sucesso/falha via callbacks

### 2. `src/pages/DashboardPage.tsx` — Reconexao automatica no evento de desconexao

Em todos os locais onde `gattserverdisconnected` e escutado (handlePairBluetooth e useEffect de auto-reconnect):

- Ao receber `gattserverdisconnected`, em vez de apenas setar `btConnected = false`:
  1. Setar `btConnected = false` (feedback visual imediato)
  2. Aguardar 1 segundo
  3. Chamar `reconnectStoredPrinter()` ou `connectToDevice()` para tentar reconectar
  4. Se sucesso: setar `btConnected = true` + toast discreto
  5. Se falha apos 3 tentativas: manter desconectada + toast de aviso

- Extrair o listener de desconexao para uma funcao reutilizavel `attachDisconnectHandler(device)` que encapsula a logica de retry

### 3. `src/lib/bluetoothPrinter.ts` — Reconexao antes de imprimir

Na funcao `sendToBluetoothPrinter`, o retry (attempt loop) ja existe, mas:
- Adicionar verificacao explicita de `device.gatt.connected` antes de cada tentativa
- Se desconectado, chamar `connectToDevice(device)` para reconectar antes de enviar dados
- Isso evita que a impressao falhe quando o BLE desconectou por inatividade

## Fluxo apos a mudanca

```text
Impressora desconecta (timeout BLE / transferencia)
  |
  v
gattserverdisconnected event
  |
  v
btConnected = false (UI atualiza: "BT: Desconectada")
  |
  v
Aguarda 1s -> tenta reconectar (ate 3x)
  |
  +-- Sucesso: btConnected = true, toast "Reconectada"
  |
  +-- Falha: mantém desconectada, toast "Verifique a impressora"
```

## Arquivos alterados
- `src/lib/bluetoothPrinter.ts` — nova funcao `autoReconnect`, melhoria no `sendToBluetoothPrinter`
- `src/pages/DashboardPage.tsx` — handler de desconexao com retry automatico

