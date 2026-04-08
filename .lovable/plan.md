

## Plano: Feedback visual no botão de parear (sem alterar lógica Bluetooth)

### O que NÃO muda
- `requestBluetoothPrinter()` — intacto
- `connectToDevice()` — intacto
- `sendToBluetoothPrinter()` — intacto
- `reconnectStoredPrinter()` — intacto
- Toda a lógica de UUIDs, chunks, retry — intacta

### O que muda (só UI + proteção)

**1. `src/lib/bluetoothPrinter.ts`** — Apenas 1 micro-ajuste:
- Adicionar um safety timer: se `isConnecting` ficar preso por 15s (ex: diálogo nativo travou), reseta para `false` automaticamente
- Zero alteração no fluxo de conexão

**2. `src/pages/DashboardPage.tsx`** — Estado `btPairing` (true/false):
- Envolve o `handlePairBluetooth` existente com try/finally + timeout de 25s
- Passa `btPairing` como prop

**3. `src/components/dashboard/PrinterTab.tsx`** — Botão mostra spinner + "Pareando..." quando ativo, desabilita clique duplo

**4. `src/components/dashboard/KitchenTab.tsx`** — Mesmo spinner no botão

**5. `src/pages/KitchenPage.tsx`** — Mesmo tratamento local

### Resumo
É como colocar um "carregando..." num botão — a impressora continua funcionando exatamente igual, só que o usuário vê que algo está acontecendo em vez do botão ficar parado.

