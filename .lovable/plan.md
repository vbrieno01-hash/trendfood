

# Aviso inteligente quando Web Bluetooth nao esta disponivel

## Problema
O usuario tenta parear a impressora Bluetooth dentro do preview do Lovable (iframe), onde a API Web Bluetooth esta bloqueada. O erro silencioso confunde o usuario, que pensa ser problema de driver.

## Solucao
Adicionar deteccao inteligente no fluxo de pareamento: quando o Web Bluetooth nao estiver disponivel, mostrar um toast claro orientando o usuario a abrir a URL publicada no Chrome.

## Mudancas

### 1. `src/pages/DashboardPage.tsx` - Melhorar `handlePairBluetooth`
- Antes de chamar `requestBluetoothPrinter()`, verificar `isBluetoothSupported()`
- Se nao suportado, mostrar toast com mensagem clara:
  - "Bluetooth nao disponivel neste navegador. Abra trendfood.lovable.app diretamente no Google Chrome."
- Retornar sem tentar parear

### 2. `src/components/dashboard/SettingsTab.tsx` - Aviso visual na secao Bluetooth
- Quando `btSupported` for `false`, exibir um alerta inline na secao de impressora Bluetooth com:
  - Icone de aviso
  - Texto: "Web Bluetooth nao esta disponivel. Abra este site pela URL publicada no Google Chrome."
  - Desabilitar o botao "Parear impressora"

## Resultado
O usuario recebe orientacao clara e imediata sobre o que fazer, em vez de um erro silencioso no console. Quando abrir pela URL publicada no Chrome, tudo funcionara normalmente.

## Detalhes tecnicos
- `isBluetoothSupported()` ja existe em `bluetoothPrinter.ts` e verifica `navigator.bluetooth`
- No iframe do Lovable, `navigator.bluetooth` existe mas esta desabilitado, entao o erro so aparece ao chamar `requestDevice()`
- Solucao: fazer um try/catch mais explicito no `handlePairBluetooth` e tratar o erro `NotFoundError` com mensagem "Web Bluetooth API globally disabled"
- O toast usara `sonner` (ja instalado no projeto)
