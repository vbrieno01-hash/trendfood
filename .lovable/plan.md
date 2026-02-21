

# Salvar automaticamente todo pedido novo na fila_impressao

## Resumo

Ajustar o fluxo para que **todo pedido novo** seja automaticamente inserido na tabela `fila_impressao` com `status: 'pendente'`, independente do modo de impressao configurado. Isso garante que o robo externo sempre receba os pedidos.

## Alteracao

### Arquivo: `src/components/dashboard/KitchenTab.tsx`

No efeito que processa pedidos pendentes de impressao (onde `pendingPrintIds` sao consumidos apos os itens carregarem), adicionar uma chamada a `enqueuePrint` que **sempre** salva o pedido na `fila_impressao`, alem de executar o modo de impressao configurado (browser/bluetooth).

Logica atual (linha ~173):
```text
if (pendingPrintIds has order.id AND items loaded) {
  remove from pendingPrintIds
  printOrderByMode(...)  // so salva na fila se mode=desktop
}
```

Logica nova:
```text
if (pendingPrintIds has order.id AND items loaded) {
  remove from pendingPrintIds
  formatReceiptText(order) -> enqueuePrint(orgId, order.id, text)
  printOrderByMode(...)  // continua executando normalmente
}
```

### Arquivo: `src/pages/KitchenPage.tsx`

Mesma alteracao no efeito equivalente da pagina standalone de cozinha.

### Nenhuma alteracao no banco

A tabela `fila_impressao` e as politicas RLS ja estao corretas.

