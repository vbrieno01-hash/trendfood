

# Corrigir conexao com impressora MPT-II (UUID faltando)

## Problema

A impressora MPT-II parea com sucesso mas nao conecta. O motivo: o Web Bluetooth com `acceptAllDevices: true` so permite acessar servicos listados em `optionalServices`. A MPT-II (e muitas impressoras termicas chinesas) usa o servico BLE `0000ffe0-0000-1000-8000-00805f9b34fb` com caracteristica `0000ffe1-...`, que nao esta na lista `ALT_SERVICE_UUIDS` do codigo atual.

Resultado: o GATT conecta, mas `getPrimaryService()` e `getPrimaryServices()` nao encontram nenhum servico acessivel, retornando null.

## Solucao

Adicionar UUIDs faltantes de impressoras termicas comuns a lista `ALT_SERVICE_UUIDS`. Isso resolve tanto a conexao inicial (pareamento) quanto a reconexao automatica.

## Alteracao tecnica

### `src/lib/bluetoothPrinter.ts`

Adicionar os seguintes UUIDs a `ALT_SERVICE_UUIDS`:

```text
Atual:
- 000018f0-...  (generico ESC/POS)
- e7810a71-...  (Nordic UART)
- 49535343-...  (Microchip/ISSC)
- 0000ff00-...  (generico)
- 0000fee7-...  (Telink)

Adicionar:
- 0000ffe0-...  (HM-10/MPT-II/impressoras chinesas BLE -- o UUID da MPT-II)
- 0000ff02-...  (algumas variantes Zjiang/Goojprt)
- 00001101-...  (SPP classico, algumas impressoras expoe via BLE)
```

O UUID `0000ffe0` e o mais critico -- e usado pela grande maioria das impressoras termicas portateis chinesas (MPT-II, MTP-2, POS-5802, etc).

## Arquivo alterado

- `src/lib/bluetoothPrinter.ts` -- adicionar UUIDs na lista `ALT_SERVICE_UUIDS`

