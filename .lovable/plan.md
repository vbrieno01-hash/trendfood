
# Metricas Financeiras no Painel Admin

## O que sera adicionado

Novos cartoes de KPI e uma secao de detalhamento financeiro na aba "Home" do painel admin, mostrando:

1. **Receita Total Estimada** -- quanto ja foi faturado com assinaturas desde o inicio (calculado com base na data de criacao de cada org pagante e o valor do plano)
2. **MRR Atual** (ja existe) -- receita recorrente mensal
3. **A Receber Este Mes** -- valor pendente/projetado para o mes corrente
4. **Trials Ativos** -- quantas lojas estao em trial (potencial de conversao)
5. **Tabela de detalhamento** -- lista resumida mostrando cada assinante pagante, plano, valor mensal e meses ativos

## Calculo da receita

Como nao existe uma tabela de pagamentos/invoices no banco, a receita sera estimada:
- Para cada org com plano "pro" ou "enterprise", calcula-se quantos meses desde `created_at` ate hoje
- Multiplica pela mensalidade (Pro = R$ 99, Enterprise = R$ 249)
- Isso da uma estimativa do total faturado

## Detalhes tecnicos

### Arquivo: `src/pages/AdminPage.tsx`

**Novos KPIs calculados** (adicionar junto aos existentes no `useMemo`):
- `totalRevenue`: soma de (meses ativos x valor do plano) para cada org pagante
- `pendingThisMonth`: MRR atual (valor a receber no mes corrente)
- `trialCount`: contagem de orgs com trial ativo

**Novos cartoes na grid de KPIs** (expandir de 4 para 6 cartoes):
- "Receita Total Estimada" com icone DollarSign
- "A Receber (Mes)" com icone de calendario
- Manter os 4 existentes

**Nova secao: Detalhamento de Assinantes**
- Tabela simples abaixo dos graficos de crescimento
- Colunas: Nome da Loja, Plano, Valor/mes, Meses Ativos, Total Estimado
- Apenas lojas com plano pago (pro ou enterprise)
- Se nenhuma loja paga, exibe mensagem "Nenhum assinante pago ainda"

### Arquivo: `src/components/admin/GrowthCharts.tsx`
- Sem alteracoes

### Resumo das mudancas
- Apenas o arquivo `src/pages/AdminPage.tsx` sera modificado
- Nenhuma mudanca no banco de dados
- Nenhuma nova dependencia
