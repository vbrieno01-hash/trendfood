

# Corrigir travamento do app apos conexao Bluetooth

## Problema
Apos parear a impressora Bluetooth, o app trava com "Nao esta respondendo" depois de alguns segundos. Isso ocorre porque as operacoes de Web Bluetooth (conexao GATT e busca de servicos) podem travar sem timeout, e a impressao automatica na Cozinha pode disparar tentativas repetidas.

## Causa raiz
1. `device.gatt.connect()` e `getPrimaryService()` nao possuem timeout -- podem ficar pendentes indefinidamente
2. Se a impressora nao suporta os UUIDs de servico esperados, a iteracao nos 3 UUIDs pode travar
3. Impressao automatica (KDS) pode disparar multiplas chamadas simultaneas ao Bluetooth

## Mudancas

### 1. `src/lib/bluetoothPrinter.ts` - Adicionar timeouts e protecao

- Criar funcao auxiliar `withTimeout(promise, ms)` que rejeita a Promise apos X milissegundos
- Aplicar timeout de 5 segundos em `device.gatt.connect()`
- Aplicar timeout de 3 segundos em cada `getPrimaryService()`
- Adicionar flag `isConnecting` para evitar tentativas simultaneas de conexao (mutex simples)
- No `sendToBluetoothPrinter`, se ja estiver conectando, retornar `false` imediatamente

### 2. `src/lib/bluetoothPrinter.ts` - Melhorar tratamento de erros

- Envolver todo o `connectToDevice` em try/catch para capturar erros de timeout
- Limpar `cachedServer` e `cachedCharacteristic` em caso de timeout
- Log claro no console quando o timeout ocorrer

### 3. `src/components/dashboard/KitchenTab.tsx` - Proteger impressao automatica

- No `useEffect` de auto-print (linha 184), adicionar verificacao: se ja existe uma impressao Bluetooth em andamento, nao disparar outra
- Usar um `ref` (`isPrintingRef`) para controlar concorrencia
- Se o Bluetooth falhar, nao tentar novamente automaticamente (so salvar na fila)

## Detalhes tecnicos

A funcao `withTimeout` sera simples:

```text
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    ),
  ]);
}
```

A flag `isConnecting` sera um `let` no escopo do modulo (assim como `cachedServer` ja e):

```text
let isConnecting = false;

async function connectToDevice(device) {
  if (isConnecting) return null;
  isConnecting = true;
  try {
    const server = await withTimeout(device.gatt.connect(), 5000, "GATT connect");
    // ... buscar servicos com timeout
  } finally {
    isConnecting = false;
  }
}
```

No KitchenTab, o ref de controle evita que dois prints Bluetooth rodem ao mesmo tempo:

```text
const isPrintingRef = useRef(false);

// No useEffect de auto-print:
if (isPrintingRef.current) return; // ja imprimindo
isPrintingRef.current = true;
await printOrderByMode(...);
isPrintingRef.current = false;
```

## Resultado
O app nao travara mais ao conectar a impressora Bluetooth. Operacoes que demoram mais de 5 segundos serao canceladas automaticamente, e o usuario recebera um aviso claro. A impressao automatica nao disparara multiplas tentativas simultaneas.

