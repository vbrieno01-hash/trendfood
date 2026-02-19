

# Melhorar identificacao de pessoas na mesa

## O que muda

Antes de montar o pedido, o cliente informa quantas pessoas estao na mesa e o nome de cada uma. Depois, ao adicionar itens, ele seleciona para quem e o item usando abas/chips com os nomes.

## Como vai funcionar

1. **Tela inicial de pessoas**: Ao abrir a pagina da mesa, antes do cardapio, aparece um campo "Quantas pessoas na mesa?" com botoes +/- (minimo 1). Abaixo, campos de nome para cada pessoa (ex: "Pessoa 1", "Pessoa 2").

2. **Chips de selecao**: Apos confirmar os nomes, o cardapio aparece com chips horizontais no topo (abaixo do header) mostrando os nomes. O chip ativo indica para quem os itens serao adicionados. Clicar em outro chip troca a pessoa ativa.

3. **Contadores por pessoa**: Os botoes +/- dos itens refletem a quantidade da pessoa selecionada. Se Joao tem 2 hamburgueres e Jose tem 1, ao selecionar Joao aparece "2", ao selecionar Jose aparece "1".

4. **Resumo agrupado**: O carrinho ja agrupa por pessoa (isso ja existe). Sera mantido e melhorado visualmente.

## Detalhes tecnicos

### Arquivo: `src/pages/TableOrderPage.tsx`

**Novos estados:**
- `people: string[]` - lista de nomes das pessoas na mesa
- `activePerson: number` - indice da pessoa ativa (para selecao de chip)
- `setupDone: boolean` - se ja configurou as pessoas

**Fluxo:**
- Se `setupDone === false`, renderiza a tela de setup (quantas pessoas + nomes)
- Se `setupDone === true`, renderiza o cardapio normal com chips de pessoa no topo
- O `customerName` atual sera substituido por `people[activePerson]`
- As funcoes `adjust()` e `getQty()` ja usam `customerName` como chave, entao basta alimentar com o nome da pessoa ativa

**Tela de setup:**
- Contador numerico (1-10) para quantidade de pessoas
- Input de texto para cada pessoa, com placeholder "Pessoa 1", "Pessoa 2", etc.
- Botao "Comecar pedido" que valida que todos os nomes estao preenchidos

**Chips de pessoa (acima do cardapio):**
- Barra horizontal com scroll, mostrando os nomes como chips/botoes
- O chip ativo tem destaque (cor primaria)
- Clicar troca `activePerson`

**Nenhuma alteracao no banco de dados** - o campo `customer_name` nos `order_items` ja existe e sera usado normalmente.
