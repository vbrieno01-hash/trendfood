
# Corrigir reconexão automática do Bluetooth

## Problema

Após recarregar a página, o Bluetooth não reconecta sozinho. A função `reconnectStoredPrinterInternal` tenta conectar direto ao GATT sem antes chamar `watchAdvertisements()`. O Chrome exige essa etapa para "redescobrir" dispositivos previamente pareados após um reload — sem ela, o `connectToDevice` falha silenciosamente porque o dispositivo não está visível para o browser.

O código atual tem um comentário dizendo "NÃO usar watchAdvertisements — pode travar o Chrome", mas esse travamento só acontece se não houver timeout. Com um timeout curto (3-5 segundos), funciona perfeitamente.

## Solução

### 1. `src/lib/bluetoothPrinter.ts` — Adicionar `watchAdvertisements` com timeout

Na função `reconnectStoredPrinterInternal`, antes de chamar `connectToDevice`, usar `watchAdvertisements()` com timeout de 4 segundos para tornar o dispositivo visível ao Chrome:

```text
Fluxo atual (falha):
  getDevices() -> find device -> connectToDevice() -> FAIL (device not visible)

Fluxo corrigido:
  getDevices() -> find device -> watchAdvertisements(timeout 4s) -> connectToDevice() -> OK
```

Detalhes:
- Chamar `device.watchAdvertisements()` e aguardar o evento `advertisementreceived` (ou timeout de 4s)
- Parar o watcher com `device.unwatchAdvertisements?.()` após sucesso ou timeout
- Se o timeout estourar mas o dispositivo foi encontrado via `getDevices()`, tentar `connectToDevice` mesmo assim (funciona em alguns dispositivos)
- Manter o timeout global de 12s em `reconnectStoredPrinter` como safety net

### 2. `src/pages/DashboardPage.tsx` — Adicionar retry com backoff

O `useEffect` de auto-reconnect (linha 297) atualmente tenta uma única vez. Se a impressora ainda está ligando quando o Dashboard carrega, a tentativa falha e não tenta mais.

Alterar para usar a função `autoReconnect` existente (que já tem backoff exponencial de 1s, 2s, 4s) como fallback quando `reconnectStoredPrinter` falha:

- Se `reconnectStoredPrinter()` retorna `null`, buscar o device via `getDevices()` e chamar `autoReconnect(device, onConnected, onFailed)`
- Isso dá 3 tentativas extras com delays crescentes, cobrindo o cenário de impressora ligando devagar

## Arquivos alterados

- `src/lib/bluetoothPrinter.ts` — watchAdvertisements com timeout na reconexão
- `src/pages/DashboardPage.tsx` — retry com backoff no useEffect de auto-reconnect
