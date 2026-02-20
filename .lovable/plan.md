
# Separar pedidos da loja e entregas no Historico

## O que muda
O historico de pedidos passara a ter um filtro adicional de **tipo** (Todos / Loja / Entregas) e os resumos (cards de Pedidos e Receita) mostrarao os totais do filtro selecionado. A logica ja existente identifica entregas como `table_number === 0`.

## Detalhes Tecnicos

### Arquivo: `src/components/dashboard/HistoryTab.tsx`

1. **Novo filtro de tipo** - Adicionar um state `typeFilter` com opcoes:
   - `"all"` - Todos
   - `"store"` - Loja (table_number > 0)
   - `"delivery"` - Entregas (table_number === 0)

2. **Botoes de filtro** - Renderizar um novo grupo de botoes (mesmo estilo dos filtros existentes de periodo e pagamento) entre o filtro de pagamento e a busca.

3. **Logica de filtragem** - Adicionar ao `filtered` existente:
   - Se `typeFilter === "store"`: excluir pedidos com `table_number === 0`
   - Se `typeFilter === "delivery"`: incluir apenas pedidos com `table_number === 0`

4. **Resumo expandido** - Alterar o grid de resumo de 2 para 4 colunas (ou manter 2x2 em mobile), adicionando cards de "Pedidos Loja" e "Entregas" com suas contagens separadas, para dar visibilidade mesmo quando o filtro esta em "Todos".

Nenhuma alteracao no banco de dados ou nos hooks e necessaria - apenas mudancas visuais e de filtragem no componente.
