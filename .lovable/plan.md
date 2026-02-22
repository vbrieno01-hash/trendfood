

# Corrigir reconexao Bluetooth cancelada por mudanca de estado

## Problema

O `useEffect` de reconexao Bluetooth (linha 329) depende de `[organization]`. Quando a pagina carrega:

1. `organization` comeca como `undefined` -- o effect roda e inicia `reconnectStoredPrinter()` (pode levar ate 20s)
2. A organizacao carrega e `organization` muda para o objeto real
3. O cleanup do primeiro effect roda (`cancelled = true`), cancelando o callback de sucesso
4. O effect roda de novo, mas o `isConnecting` guard dentro de `connectToDevice` ainda pode estar `true` da tentativa anterior, fazendo a segunda tentativa falhar silenciosamente

Resultado: a reconexao nunca completa.

## Solucao

Remover `organization` da lista de dependencias do effect de reconexao. Esse effect so precisa rodar uma vez no mount -- ele nao depende de nenhum dado da organizacao. Usar um ref para garantir que roda apenas uma vez.

## Alteracao

### `src/pages/DashboardPage.tsx`

Trocar a dependencia do useEffect de `[organization]` para `[]` (rodar apenas no mount) e adicionar um guard ref para evitar execucao dupla:

```typescript
const btReconnectAttempted = useRef(false);

useEffect(() => {
  if (btDevice) return;
  if (!isBluetoothSupported()) return;
  if (btReconnectAttempted.current) return;
  btReconnectAttempted.current = true;

  const onConnected = (device: BluetoothDevice) => {
    setBtDevice(device);
    setBtConnected(true);
    toast.success("Impressora reconectada automaticamente");
    attachDisconnectHandler(device);
  };

  reconnectStoredPrinter()
    .then(async (device) => {
      if (device) {
        onConnected(device);
        return;
      }
      // backoff retry (igual ao atual)
      ...
    })
    .catch(...);
}, []); // sem dependencia de organization
```

Isso elimina o problema de cancelamento e garante que a reconexao rode do inicio ao fim sem interrupcao.

## Arquivo alterado

- `src/pages/DashboardPage.tsx` -- dependencia do effect + guard ref

