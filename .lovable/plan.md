
# Remover enqueuePrint duplicado da Cozinha

## Resumo

Remover as chamadas duplicadas de `enqueuePrint` nos dois componentes de cozinha, mantendo apenas a do `usePlaceOrder` (que ja enfileira ao criar o pedido). A impressao local (browser/bluetooth) continua funcionando normalmente nesses componentes.

## Alteracoes

### 1. `src/components/dashboard/KitchenTab.tsx`
- Linha 179-181: Remover as 2 linhas do comentario e da chamada `enqueuePrint`
- Remover o import de `enqueuePrint` (linha 12) e `formatReceiptText` (linha 11), caso nao sejam usados em outro lugar do arquivo
- Manter `printOrderByMode` (impressao local na tela da cozinha)

### 2. `src/pages/KitchenPage.tsx`
- Linha 133-135: Remover as 2 linhas do comentario e da chamada `enqueuePrint`
- Remover o import de `enqueuePrint` (linha 14) e `formatReceiptText` (linha 13), caso nao sejam usados em outro lugar do arquivo
- Manter `printOrderByMode` (impressao local na tela da cozinha)

### Resultado

Cada pedido gerara **uma unica entrada** na `fila_impressao`, criada no momento do pedido pelo `usePlaceOrder`. As telas de cozinha continuam imprimindo localmente via `printOrderByMode` sem duplicar na fila.
