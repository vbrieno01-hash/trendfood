

# Atualizar KitchenPage.tsx com botao Bluetooth e protecoes

## Problema
O `KitchenPage.tsx` (pagina standalone da cozinha acessada via `/kitchen?org=slug`) nao recebeu as mesmas atualizacoes que o `KitchenTab.tsx` dentro do Dashboard. Falta:
1. Botao de parear impressora Bluetooth
2. Protecao de impressao concorrente (isPrintingRef)

## Mudancas

### `src/pages/KitchenPage.tsx`
- Importar `requestBluetoothPrinter`, `isBluetoothSupported` de `bluetoothPrinter.ts`
- Adicionar estados: `btDevice`, `btConnected`, `btSupported`
- Criar funcao `handlePairBluetooth` com deteccao de suporte e try/catch (mesmo padrao do DashboardPage)
- Adicionar botao de pareamento no header, ao lado do toggle "Imprimir automatico" (visivel apenas quando `print_mode === "bluetooth"`)
- Adicionar `isPrintingRef` para evitar impressoes Bluetooth concorrentes no useEffect de auto-print
- Passar `btDevice` para as chamadas de `printOrderByMode` (atualmente passa `null`)

### Detalhes tecnicos

No header, junto aos controles existentes:

```text
{printMode === "bluetooth" && (
  <Button variant="outline" size="sm" onClick={handlePairBluetooth} disabled={!btSupported}>
    <Printer />
    {btConnected ? "Conectada" : "Parear impressora"}
  </Button>
)}
```

No useEffect de auto-print, envolver com `isPrintingRef`:

```text
if (isPrintingRef.current) return;
isPrintingRef.current = true;
// ... loop de impressao
isPrintingRef.current = false;
```

Na chamada de `printOrderByMode`, trocar `null` por `btDevice` para que a impressao Bluetooth funcione de fato.

