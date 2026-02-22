

# Corrigir erro "Nao esta respondendo" causado pela reconexao Bluetooth

## Problema

Quando a pagina carrega, `reconnectStoredPrinter()` e chamada e pode travar por ate 18 segundos (8s watchAdvertisements + 10s GATT connect) se a impressora estiver desligada ou fora de alcance. O Chrome interpreta essa espera longa como "pagina nao respondendo".

Alem disso, se `watchAdvertisements` falha (timeout), o codigo ainda tenta `connectToDevice()` que adiciona mais 10 segundos de espera.

## Solucao

### 1. `src/lib/bluetoothPrinter.ts` — Nao tentar connectToDevice se watchAdvertisements falhou

Se `watchAdvertisements` deu timeout (impressora desligada/longe), nao faz sentido tentar o GATT connect. Retornar `null` imediatamente nesse caso.

Mudanca:
- Adicionar flag `advertisementFailed = false`
- Se o catch de `watchAdvertisements` for acionado por timeout, setar `advertisementFailed = true`
- Se `advertisementFailed`, pular o `connectToDevice` e retornar `null`

### 2. `src/pages/DashboardPage.tsx` — Nao travar se reconexao falhar silenciosamente

Adicionar `.catch(() => null)` na chamada de `reconnectStoredPrinter()` para garantir que erros nao propagados nao causem problemas.

### 3. Reduzir timeout do watchAdvertisements de 8s para 5s

8 segundos e muito tempo para esperar em background. 5 segundos e suficiente para detectar uma impressora que esta ligada e proxima.

## Resumo das alteracoes

- `src/lib/bluetoothPrinter.ts`: Pular connectToDevice quando watchAdvertisements falha por timeout; reduzir timeout para 5s
- `src/pages/DashboardPage.tsx`: Adicionar catch na promise de reconexao

