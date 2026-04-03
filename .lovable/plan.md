

## Plano: Melhorar Relatórios do Lojista com filtro por período customizado e exportação completa

### Problema
Atualmente o `ReportsTab` do lojista só permite 7, 30 ou 90 dias. Para declaração de imposto, o lojista precisa puxar relatórios de períodos maiores (6 meses, 1 ano). Além disso, falta exportação CSV e tabela detalhada com cada pedido individual.

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useOrders.ts` | Adicionar variante do `useOrderHistory` que aceita datas customizadas (from/to) sem limite de 500 rows — paginar se necessário. Remover `limit(500)` quando período é "custom" |
| `src/components/dashboard/ReportsTab.tsx` | Adicionar opção "Personalizado" ao seletor de período, que abre dois date pickers (De / Até) sem limite de dias. Adicionar botão "Exportar CSV" no dropdown de download. Adicionar seção com tabela detalhada de pedidos (ID, data, valor, método de pagamento) abaixo dos gráficos existentes. No PDF/PNG exportado, incluir cabeçalho com dados da loja (nome, CNPJ, endereço) como comprovante formal de faturamento |

### Fluxo do lojista
1. Vai em "Relatórios" no dashboard
2. Clica em "Personalizado" no seletor de período
3. Escolhe data início e fim (sem limite — pode ser 1 ano inteiro)
4. Vê KPIs, gráficos e tabela detalhada com todos os pedidos
5. Exporta CSV ou PDF com cabeçalho da loja para fins fiscais

### Detalhes técnicos
- O `useOrderHistory` passará a aceitar `{ from: string, to: string }` como período alternativo
- Remove o `limit(500)` para períodos customizados — busca todos os pedidos entregues no intervalo
- CSV inclui BOM UTF-8 e colunas: Pedido, Data, Valor, Pagamento
- PDF inclui CNPJ da loja (campo `cnpj` já existe na tabela `organizations`) no cabeçalho
- Tabela de pedidos detalhada aparece abaixo do ranking de categorias, com paginação visual (mostrar 50 por vez com botão "ver mais")

