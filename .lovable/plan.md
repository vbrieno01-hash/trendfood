

# Menu Lateral com Accordions + Resumo Rápido na Dashboard

## Mudanças

### 1. Sidebar com Accordions (`DashboardPage.tsx`)

Substituir as 3 listas flat (`navItemsTop`, `navItemsOps`, `navItemsBottom`) por 4 grupos accordion usando `Collapsible` do Radix (já instalado).

**Home** fica fora dos accordions, como botão fixo no topo.

Mapeamento das abas nos grupos:

```text
🏠 Home (botão fixo, fora de accordion)

⚡ OPERACIONAL (defaultOpen = true)
   ├── Gestão de Pedidos (Kanban)  → waiter
   ├── Mesas & Comandas            → tables
   ├── Cozinha (KDS)               → kitchen
   ├── Histórico                   → history
   └── Motoboys                    → courier

📦 LOGÍSTICA
   ├── Cardápio (Menu)             → menu
   └── Estoque & Insumos           → stock

💰 FINANCEIRO
   ├── Fluxo de Caixa              → caixa
   ├── Relatórios                  → reports
   ├── Cupons                      → coupons
   └── Mais Vendidos               → bestsellers

⚙️ AJUSTES
   ├── Dados da Loja               → profile
   ├── Assinatura / Plano          → subscription
   ├── Impressora Térmica           → printer
   ├── Funcionalidades             → features
   ├── Como Usar                   → guide
   └── Configurações               → settings
```

Cada grupo: header clicável com emoji + título + chevron. Grupo OPERACIONAL inicia aberto; demais fechados. Ao clicar numa aba, o grupo correspondente abre automaticamente.

### 2. Resumo Rápido no HomeTab (`HomeTab.tsx`)

Adicionar 3 cards no topo (antes do hero de faturamento):

- **Pedidos Ativos**: conta pedidos com status `pending` ou `preparing` (já disponível via `useOrders`)
- **Mesas Ocupadas**: query em `orders` com status `pending`/`preparing` agrupando por `table_number` distintos
- **Alertas de Estoque Baixo**: query em `stock_items` onde `quantity <= min_quantity` e `min_quantity > 0`

Os 3 cards ficam numa row horizontal com ícones, valores grandes e cores distintas.

### Arquivos alterados
- `src/pages/DashboardPage.tsx` — sidebar com accordions via Collapsible
- `src/components/dashboard/HomeTab.tsx` — 3 cards de resumo rápido no topo

