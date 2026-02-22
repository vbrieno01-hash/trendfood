

# Sincronizar KitchenPage.tsx com KitchenTab.tsx (Bluetooth + isPrintingRef)

## Problema
O `KitchenPage.tsx` (pagina standalone `/cozinha?org=slug`) esta defasado. Faltam 3 coisas que ja existem no `KitchenTab.tsx`:

1. Botao de parear impressora Bluetooth
2. Protecao de impressao concorrente (`isPrintingRef`)
3. Passagem do `btDevice` real (hoje passa `null`)

## Mudancas no `src/pages/KitchenPage.tsx`

### 1. Importar funcoes Bluetooth
Adicionar imports de `isBluetoothSupported` e `requestBluetoothPrinter` do modulo `bluetoothPrinter.ts`.

### 2. Adicionar estados e logica Bluetooth
- `btDevice` (BluetoothDevice | null)
- `btConnected` (derivado de `btDevice?.gatt?.connected`)
- `btSupported` (detectado uma vez via `isBluetoothSupported()`)
- `handlePairBluetooth` com try/catch e toast de erro (mesmo padrao do DashboardPage)

### 3. Extrair `printMode` e `printerWidth` como variaveis reutilizaveis
Hoje estao duplicados inline em 2 lugares. Serao calculados uma vez no corpo do componente.

### 4. Adicionar botao Bluetooth no header
Ao lado do toggle "Imprimir automatico", quando `printMode === "bluetooth"`, mostrar botao com status verde quando conectado.

### 5. Adicionar `isPrintingRef` no auto-print
O `useEffect` de impressao pendente (linha 184) sera protegido com `isPrintingRef` e loop `async/await` sequencial — identico ao KitchenTab.

### 6. Passar `btDevice` real em todas as chamadas
Trocar os 2 `null` por `btDevice`:
- Impressao automatica (useEffect)
- Botao manual de imprimir (cada card)

## Resumo das diferencas que serao corrigidas

| Recurso | KitchenTab | KitchenPage (antes) | KitchenPage (depois) |
|---|---|---|---|
| Botao Bluetooth | Sim | Nao | Sim |
| isPrintingRef | Sim | Nao | Sim |
| btDevice real | Sim | null | Sim |
| printMode/width reutilizavel | Via props | Inline duplicado | Variavel unica |

## Regra permanente
A partir de agora, qualquer mudanca feita em KitchenTab.tsx sera obrigatoriamente replicada no KitchenPage.tsx e vice-versa.
