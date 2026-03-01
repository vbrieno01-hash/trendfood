

## Plano: Redesign Completo do Painel Admin TrendFood

### Visão Geral
Modernizar o painel admin com um design mais profissional, limpo e conectado à identidade TrendFood. O painel é o centro de controle do SaaS e precisa refletir isso.

### Alterações

**1. Sidebar Modernizada (`AdminPage.tsx`)**
- Gradiente escuro premium (de `#111` para gradiente com tons de laranja sutil)
- Logo maior com texto "TrendFood Admin" estilizado
- Badge "Admin" com glow sutil na cor primária
- Agrupamento visual das seções de navegação (Visão Geral, Gestão, Sistema)
- Separadores entre grupos com labels discretos
- Ícone ativo com background arredondado e borda lateral (indicator bar)
- Botão de ir ao Dashboard do lojista na sidebar

**2. Home Tab - Dashboard Executivo**
- Header com saudação "Bom dia, Admin" + data atual
- KPI cards redesenhados: mais compactos, com sparkline micro ou % de variação
- Cards com hover effect sutil e transição suave
- Gráficos de crescimento com área preenchida (AreaChart) em vez de linha simples
- Seção "Ações Rápidas" com botões de atalho (Ativar loja, Ver logs, Gerar link)
- Tabela de assinantes com avatares coloridos e status pills mais refinados

**3. Lojas Tab - Lista Aprimorada**
- Cards de loja com layout mais limpo e informações hierarquizadas
- Barra de filtros com design pill/chip mais moderno
- Contador de resultados mais visível
- Quick-actions inline (ativar, gerenciar, abrir loja) com ícones

**4. Gráficos (`GrowthCharts.tsx`)**
- Trocar LineChart por AreaChart com gradiente de preenchimento
- Tooltip customizado mais bonito
- Labels mais legíveis

**5. KPI Card Component**
- Redesenhar com micro-trend indicator (seta ↑↓ ou %)
- Ícone com background mais suave e arredondado
- Tipografia: valor grande em destaque, label abaixo em muted

**6. Mobile Experience**
- Header mobile com gradiente matching a sidebar
- Bottom sheet menu em vez de sidebar deslizante (mais nativo)
- Cards KPI em scroll horizontal no mobile

**7. Conexão com Dashboard do Lojista**
- Botão "Ir ao Dashboard" na sidebar que leva a `/dashboard`
- Link "Ir ao site" que leva a `/`

### Componentes afetados
- `src/pages/AdminPage.tsx` — rewrite completo do layout, sidebar, home tab e store cards
- `src/components/admin/GrowthCharts.tsx` — AreaChart + gradientes + tooltip melhorado

### O que NÃO muda
- Lógica de negócio (KPIs, filtros, ativação, etc.)
- Componentes de sub-tabs existentes (PlansConfig, ErrorLogs, ActivationLogs, etc.)
- Rotas e autenticação

