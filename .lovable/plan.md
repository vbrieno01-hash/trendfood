

## Plano: Adicionar seção de Meios de Pagamento e tabela Lista de Pedidos

### Mudanças no arquivo `src/components/dashboard/ReportsTab.tsx`

**1. Seção "Meios de Pagamento"** — Adicionar após o gráfico de Horários de Pico e antes do Ranking por Item:
- Um `useMemo` que agrupa os pedidos por `payment_method` e calcula: quantidade de pedidos e faturamento total por método
- Exibir como tabela estilizada com 4 colunas: Meio de Pagamento, Qtd Pedidos, Faturamento, % do Total
- Incluir um mini gráfico de barras horizontal (recharts `BarChart` horizontal) mostrando a proporção visual de cada método
- Cores distintas: PIX (verde), Crédito (azul), Débito (roxo), Dinheiro (amarelo), Pendente (cinza)

**2. Renomear "Detalhamento de Pedidos" para "Lista de Pedidos"** e adicionar coluna Status:
- Adicionar coluna "Status" na tabela existente (todas serão "Entregue" pois o hook filtra `status: delivered`)
- Manter as colunas existentes: Pedido, Data/Hora, Valor, Pagamento + nova coluna Status
- Mover esta seção para ficar abaixo do Ranking (já está lá)

**3. Atualizar `buildReportHtml`** para incluir a tabela de meios de pagamento nos exports PDF/PNG/CSV

### Layout da seção de pagamento

```text
┌──────────────────────────────────────────────┐
│  💳 Faturamento por Meio de Pagamento        │
│                                              │
│  Meio        │ Pedidos │ Faturamento │ %     │
│  PIX         │ 45      │ R$ 4.500    │ 52%   │
│  Dinheiro    │ 20      │ R$ 2.100    │ 24%   │
│  Crédito     │ 15      │ R$ 1.500    │ 17%   │
│  Débito      │ 7       │ R$ 600      │  7%   │
│                                              │
│  [Gráfico barras horizontal com cores]       │
└──────────────────────────────────────────────┘
```

### Detalhes
- Nenhuma mudança de banco de dados necessária
- Apenas 1 arquivo editado: `src/components/dashboard/ReportsTab.tsx`
- Os dados de `payment_method` já existem nos pedidos retornados pelo hook

