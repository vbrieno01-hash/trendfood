
# Enfileirar impressao automaticamente ao criar pedido

## Resumo

Alterar a funcao `usePlaceOrder` em `src/hooks/useOrders.ts` para que, apos inserir o pedido e seus itens com sucesso, chame `enqueuePrint` da `src/lib/printQueue.ts` para inserir uma linha na tabela `fila_impressao` com status `pendente`.

## Alteracao

### Arquivo: `src/hooks/useOrders.ts`

1. Importar `enqueuePrint` de `@/lib/printQueue` e `formatReceiptText` de `@/lib/formatReceiptText`
2. Na `mutationFn` de `usePlaceOrder`, apos inserir os `order_items` (linha 188-189), adicionar um bloco que:
   - Monta um objeto `PrintableOrder` com os dados do pedido recem-criado e seus itens
   - Gera o texto formatado via `formatReceiptText`
   - Chama `enqueuePrint(organizationId, order.id, textoFormatado)`
   - Envolve em try/catch para nao bloquear o fluxo principal caso a fila falhe (apenas loga o erro no console)

### Detalhes tecnicos

- O `enqueuePrint` ja existe e insere na tabela `fila_impressao` com `organization_id`, `order_id`, `conteudo_txt` e `status: "pendente"`
- O `formatReceiptText` ja formata o recibo em texto plano (32 colunas) compativel com impressoras termicas
- A chamada sera feita com `try/catch` isolado para que uma falha na fila de impressao nao impeca o pedido de ser criado
- Nenhuma alteracao de banco de dados e necessaria -- a tabela `fila_impressao` ja existe com a estrutura correta
