

# Corrigir fallback da impressao Bluetooth automatica

## Problema raiz

A reconexao sob demanda (`reconnectStoredPrinter`) frequentemente falha porque depende de `watchAdvertisements` (nem todos os navegadores suportam) e da impressora estar visivel no momento exato. Quando falha, `btDeviceRef.current` continua null e o sistema cai no modo `'browser'`, que tenta abrir um popup -- bloqueado pelo navegador em callbacks de fundo.

O modo `'bluetooth'` em `printOrderByMode` ja tem um fallback inteligente: se o device e null ou a impressao falha, ele salva o pedido na fila de impressao (`fila_impressao`). Mas esse fallback so e usado quando o `effectiveMode` e `'bluetooth'`.

## Solucao

Mudar a logica do `effectiveMode`: se existe um device ID salvo no localStorage (usuario ja pareou antes), usar `'bluetooth'` como modo -- mesmo que a reconexao tenha falhado. Isso garante que o pedido vai para a fila de impressao em vez de tentar um popup bloqueado.

## Alteracao

### `src/pages/DashboardPage.tsx` (linhas 214-216)

Trocar a logica do effectiveMode:

**Antes:**
```typescript
const effectiveMode = btDeviceRef.current
  ? 'bluetooth' as const
  : printModeRef.current;
```

**Depois:**
```typescript
const effectiveMode = (btDeviceRef.current || getStoredDeviceId())
  ? 'bluetooth' as const
  : printModeRef.current;
```

Isso cobre tres cenarios:
- Bluetooth conectado: imprime direto via BT
- Bluetooth pareado mas desconectado: `printOrderByMode` tenta imprimir, falha, e salva na fila
- Sem Bluetooth: usa o modo do banco (browser/desktop)

## Arquivo alterado

- `src/pages/DashboardPage.tsx` -- effectiveMode usa bluetooth quando tem device salvo

