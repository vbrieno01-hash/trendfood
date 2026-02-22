

# Configurar Bluetooth na Cozinha - Compartilhar dispositivo pareado

## Problema atual
O estado `btDevice` (impressora Bluetooth pareada) vive apenas dentro do `SettingsTab`. O `KitchenTab` recebe `btDevice` como prop, mas o `DashboardPage` nunca passa esse valor -- ele fica `undefined`. Resultado: mesmo com a impressora pareada, a cozinha nao consegue imprimir via Bluetooth.

## Solucao
Levantar o estado do dispositivo Bluetooth para o `DashboardPage`, compartilhando entre `SettingsTab` e `KitchenTab`.

## Mudancas

### 1. `src/pages/DashboardPage.tsx`
- Importar `requestBluetoothPrinter`, `disconnectPrinter`, `isBluetoothSupported` de `bluetoothPrinter.ts`
- Criar estado `btDevice` e `btConnected` no nivel do DashboardPage
- Criar handlers `handlePairBluetooth` e `handleDisconnectBluetooth`
- Passar `btDevice`, `btConnected`, handlers e `isBluetoothSupported` como props para `SettingsTab`
- Passar `btDevice` para `KitchenTab` (ja aceita essa prop)

### 2. `src/components/dashboard/SettingsTab.tsx`
- Remover estado local de `btDevice` e `btConnected`
- Receber via props: `btDevice`, `btConnected`, `onPairBluetooth`, `onDisconnectBluetooth`, `btSupported`
- Manter toda a UI identica, apenas usando props em vez de estado local

### 3. `src/components/dashboard/KitchenTab.tsx`
- Nenhuma mudanca necessaria (ja aceita `btDevice` como prop)

## Resultado
Ao parear a impressora Bluetooth nas Configuracoes, o dispositivo fica disponivel automaticamente para a Cozinha (KDS). A impressao automatica e manual funcionara via Bluetooth em ambas as telas.

## Detalhes tecnicos

```text
DashboardPage (btDevice state)
  |
  |-- SettingsTab (recebe btDevice + handlers via props)
  |
  |-- KitchenTab (recebe btDevice via prop - ja implementado)
```

- O estado `btDevice` fica no `DashboardPage` para sobreviver a troca de abas
- O listener `gattserverdisconnected` e registrado no DashboardPage
- Nenhuma mudanca no banco de dados e necessaria
