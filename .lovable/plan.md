
# Relatórios Avançados + Delivery "Em Breve"

## Resumo

Criar uma nova aba **"Relatórios"** no dashboard com graficos e metricas avancadas (Enterprise/Lifetime), e adicionar **"Integracao com Delivery"** como item "Em breve" na aba de Funcionalidades.

---

## Mudancas

### 1. Nova feature gate: `reports`

**Arquivo: `src/hooks/usePlanLimits.ts`**
- Adicionar `"reports"` ao type `Feature`
- `free.reports: false`, `pro.reports: false`, `enterprise.reports: true`, `lifetime.reports: true`

### 2. Novo componente: `src/components/dashboard/ReportsTab.tsx`

Aba exclusiva Enterprise/Lifetime com os seguintes blocos:

- **Cards de resumo**: Faturamento total, Ticket medio, Total de pedidos, Pedidos por dia (media)
- **Grafico de faturamento por periodo**: Selecao de periodo (7d, 30d, 90d), grafico de barras/linha com receita diaria
- **Horarios de pico**: Grafico de barras mostrando volume de pedidos por hora do dia (0-23h)
- **Comparativo semanal**: Receita da semana atual vs semana anterior com variacao percentual
- **Ranking por categoria**: Receita agrupada por categoria de item do cardapio

Dados serao obtidos via `useOrderHistory` com periodo "all" ou "30d", processados no frontend com `useMemo`.

### 3. Registrar a aba no Dashboard

**Arquivo: `src/pages/DashboardPage.tsx`**
- Importar `ReportsTab`
- Adicionar `"reports"` ao type `TabKey`
- Adicionar item no `navItemsTop`: `{ key: "reports", icon: <BarChart2 />, label: "Relatorios", locked: !planLimits.canAccess("reports") }`
- Renderizar na area de conteudo: se locked, mostrar `UpgradePrompt`; senao, `<ReportsTab orgId={organization.id} />`

### 4. Adicionar itens na aba Funcionalidades

**Arquivo: `src/components/dashboard/FeaturesTab.tsx`**
- Adicionar ao array `FEATURES`:
  - `{ title: "Relatorios Avancados", description: "Graficos de faturamento, ticket medio, horarios de pico e comparativos.", minPlan: "enterprise", status: "available" }`
  - `{ title: "Integracao com Delivery", description: "Receba e gerencie pedidos de delivery diretamente pelo painel.", minPlan: "enterprise", status: "coming_soon" }`

---

## Detalhes tecnicos

- Nenhuma mudanca no banco de dados -- todos os dados ja existem na tabela `orders` + `order_items`
- Os graficos usarao `recharts` (ja instalado): `BarChart`, `LineChart`, `ComposedChart`
- O processamento de horarios de pico usa `new Date(order.created_at).getHours()` para agrupar
- O ranking por categoria faz join com `menu_items` via `order_items.menu_item_id` (ja disponivel nos dados)
- Design seguira o padrao existente: cards com glassmorphism, filtros pill, max-w-4xl
