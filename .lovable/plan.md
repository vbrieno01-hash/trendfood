

# Corrigir dialogo Bluetooth mostrando "Nenhum dispositivo compativel"

## Problema
O `requestBluetoothPrinter` tenta primeiro abrir o seletor do Chrome com filtros de servico (5 UUIDs conhecidos). Como a impressora generica nao anuncia nenhum desses UUIDs, o Chrome mostra "Nenhum dispositivo compativel encontrado". O fallback para `acceptAllDevices` so dispara DEPOIS que o usuario cancela o dialogo manualmente — o que na pratica nunca acontece.

## Solucao
Inverter a estrategia: usar `acceptAllDevices: true` como abordagem principal (mostra todos os dispositivos Bluetooth), mantendo os `optionalServices` para que a descoberta de servicos funcione apos o pareamento.

## Mudanca

### `src/lib/bluetoothPrinter.ts` — funcao `requestBluetoothPrinter()`

Substituir a logica atual por:

```text
export async function requestBluetoothPrinter() {
  // Usar acceptAllDevices diretamente — impressoras genericas
  // nao anunciam UUIDs padrao, entao filtros nao funcionam.
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ALT_SERVICE_UUIDS,
  });
  // salvar ID no localStorage para reconexao automatica
  if (device?.id) localStorage.setItem(STORED_DEVICE_KEY, device.id);
  return device;
}
```

Isso remove o try/catch duplo com filtro+fallback e vai direto para a abordagem que funciona com qualquer impressora.

## Impacto
- Apenas 1 arquivo alterado: `src/lib/bluetoothPrinter.ts`
- O seletor do Chrome vai mostrar TODOS os dispositivos Bluetooth (nao apenas impressoras), mas isso e preferivel a nao mostrar nenhum
- A descoberta dinamica de servicos no `connectToDevice` continua garantindo que a impressora certa seja encontrada apos o pareamento

