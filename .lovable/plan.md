
# Corrigir impressao automatica no modo "browser"

## Problema

O `print_mode` da organizacao esta configurado como `browser`. Nesse modo, `printOrder()` chama `window.open()` para abrir uma janela popup com o recibo. Porem, quando essa chamada vem do callback Realtime (auto-print), o navegador **bloqueia o popup** silenciosamente porque nao e resultado de um clique direto do usuario.

O pedido de entrega foi inserido corretamente na `fila_impressao` pelo hook de criacao do pedido, e o robo externo marcou como `impresso`. Mas a impressao fisica via Dashboard nao aconteceu porque o popup foi bloqueado.

## Solucao

No callback Realtime de auto-print dentro do `DashboardPage.tsx`, quando o modo for `browser`, nao tentar abrir popup. Em vez disso, usar a fila desktop (`enqueuePrint`) como canal de impressao automatica. Isso garante que:

- Pedidos de entrega, mesa, retirada - todos sao enfileirados automaticamente
- O robo de impressao desktop consome a fila e imprime fisicamente
- Nenhum pedido e perdido por popup bloqueado

Se o modo for `bluetooth` ou `desktop`, o comportamento continua igual (ja funciona).

## Alteracoes

### `src/pages/DashboardPage.tsx`

No callback Realtime (linhas ~189-207), alterar a logica de auto-print:

```
// ANTES (falha silenciosamente no modo browser):
await printOrderByMode(fullOrder, orgNameRef.current, printModeRef.current, orgId!, btDeviceRef.current, ...);

// DEPOIS:
const mode = printModeRef.current;
if (mode === 'browser') {
  // Modo browser usa popup que e bloqueado em callbacks automaticos.
  // Enfileirar na fila desktop como fallback seguro.
  const text = formatReceiptText(fullOrder, orgNameRef.current, printerWidthRef.current);
  await enqueuePrint(orgId!, fullOrder.id, stripFormatMarkers(text));
} else {
  // Bluetooth e desktop funcionam normalmente sem popup
  await printOrderByMode(fullOrder, orgNameRef.current, mode, orgId!, btDeviceRef.current, getPixPayload(fullOrder), printerWidthRef.current);
}
```

Isso requer importar `formatReceiptText`, `stripFormatMarkers` de `@/lib/formatReceiptText` e `enqueuePrint` de `@/lib/printQueue`.

### Resultado

- **Modo browser**: auto-print enfileira na fila desktop (robo imprime)
- **Modo desktop**: ja enfileira na fila (sem mudanca)
- **Modo bluetooth**: envia via BLE (sem mudanca)
- Botoes manuais de "Imprimir" continuam funcionando normalmente com popup

## Arquivos alterados

- `src/pages/DashboardPage.tsx` — fallback para fila no modo browser + novos imports
