
# Reconexao Bluetooth confiavel com botao de fallback

## Diagnostico

No Android Chrome, a reconexao automatica BLE sem gesto do usuario falha frequentemente. O `getDevices()` retorna o device, mas `device.gatt.connect()` falha silenciosamente porque o Android exige interacao do usuario para conexoes GATT em muitos cenarios.

A reconexao automatica continuara tentando (funciona em ~30% dos reloads), mas precisamos de um fallback confiavel.

## Solucao

Duas mudancas:

### 1. Adicionar logging detalhado na reconexao (`src/lib/bluetoothPrinter.ts`)

Adicionar `console.log` em cada etapa critica da `reconnectStoredPrinterInternal` para diagnostico futuro:
- Log quando encontra o device via `getDevices()`
- Log quando GATT connect falha (com o erro especifico)
- Log quando nenhuma caracteristica writavel e encontrada

### 2. Botao "Reconectar Impressora" no Dashboard (`src/pages/DashboardPage.tsx`)

Quando o sistema detecta que:
- Existe um device salvo no localStorage (`getStoredDeviceId() !== null`)
- Mas `btConnected` e `false` apos a tentativa automatica

Mostrar um botao/toast persistente: **"Impressora nao reconectou. Toque para reconectar"**

O toque no botao chama `reconnectStoredPrinter()` (que agora funciona porque tem gesto do usuario), ou se falhar, abre o dialogo de pareamento novamente.

### Fluxo atualizado

```text
Pagina carrega
  |
  v
Tenta reconexao automatica (silenciosa)
  |
  +-- Sucesso --> Toast "Reconectada automaticamente"
  |
  +-- Falha --> Mostra botao "Reconectar Impressora" 
                  |
                  Toque --> reconnectStoredPrinter()
                    |
                    +-- Sucesso --> Toast "Reconectada"
                    +-- Falha --> requestBluetoothPrinter() (novo pareamento)
```

## Detalhes tecnicos

### `src/lib/bluetoothPrinter.ts`
- Adicionar logs em `reconnectStoredPrinterInternal` para cada passo
- Nao muda logica, so visibilidade

### `src/pages/DashboardPage.tsx`
- Novo estado: `btReconnectFailed` (boolean, default false)
- No callback de falha do useEffect de reconexao, setar `btReconnectFailed = true`
- Renderizar um banner/botao fixo no topo quando `btReconnectFailed && !btConnected && getStoredDeviceId()`
- Handler do botao: tenta `reconnectStoredPrinter()`, se falhar chama `requestBluetoothPrinter()`
- Ao conectar com sucesso, setar `btReconnectFailed = false`

## Arquivos alterados

- `src/lib/bluetoothPrinter.ts` -- logs de diagnostico
- `src/pages/DashboardPage.tsx` -- estado `btReconnectFailed` + botao de reconexao
