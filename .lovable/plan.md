

# Formatar conteudo_txt com maximo de 32 caracteres por linha

## Resumo

Ajustar `formatReceiptText` para que **todas as linhas** do texto gerado tenham no maximo 32 caracteres visíveis (excluindo marcadores como `##BOLD##` e `##CENTER##`). Isso garante compatibilidade universal com impressoras termicas de 58mm e 80mm de qualquer marca.

## Problemas atuais

1. Quando `printerWidth` e `80mm`, o sistema gera linhas com ate 48 caracteres -- ultrapassa o limite
2. Nomes de itens longos ou enderecos de clientes podem gerar linhas maiores que 32 caracteres sem quebra
3. O divisor (`---`) usa `cols` variavel, podendo ter 48 tracos

## Alteracoes

### Arquivo: `src/lib/formatReceiptText.ts`

1. **Fixar `cols = 32` sempre** -- remover a logica que diferencia 58mm/80mm. O parametro `printerWidth` pode ser mantido na assinatura para compatibilidade, mas o numero de colunas sera sempre 32.

2. **Adicionar funcao `wrapLine(text, maxCols)`** -- quebra qualquer string que ultrapasse 32 caracteres em multiplas linhas, quebrando preferencialmente em espacos. Retorna um array de strings.

3. **Ajustar formatacao de itens** -- quando `qty + nome + preco` exceder 32 caracteres:
   - Primeira linha: `qty nome` (truncado/quebrado em 32 chars)
   - Segunda linha: preco alinhado a direita
   - Isso garante que o preco nunca seja cortado

4. **Aplicar `wrapLine` nos campos de cliente** -- endereco, nome e observacoes podem ser longos e devem ser quebrados respeitando o limite de 32 colunas.

5. **Ajustar linha do TOTAL com ##BOLD##** -- garantir que o texto visivel (sem o marcador) tenha no maximo 32 caracteres. Atualmente o padding com espacos conta a partir de `cols` mas ignora o tamanho do marcador.

### Arquivo: `src/lib/bluetoothPrinter.ts`

Nenhuma alteracao necessaria -- o processamento dos marcadores `##CENTER##` e `##BOLD##` ja esta correto e independe do numero de colunas.

### Arquivo: `src/lib/printQueue.ts`

Nenhuma alteracao -- o texto ja e salvo como texto simples (sem HTML) na tabela `fila_impressao`.

## Resultado esperado

Todo `conteudo_txt` salvo na tabela `fila_impressao` tera no maximo 32 caracteres por linha, garantindo impressao limpa em qualquer impressora termica sem corte ou overflow.

