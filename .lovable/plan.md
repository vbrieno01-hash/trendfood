

# Adicionar Sidebar ao Painel Admin (igual ao Dashboard)

## Objetivo

Transformar o layout do Admin de uma pagina unica com scroll para um layout com sidebar lateral escura (igual ao Dashboard dos clientes), onde cada secao abre como uma "aba" ao clicar no menu lateral.

## Estrutura das Abas

| Aba | Icone | Conteudo |
|-----|-------|----------|
| Home | Home | KPI Cards + Graficos de Crescimento |
| Lojas | Store | Grid de lojas com filtros, busca, CSV |
| Configuracoes | Settings | Taxas de entrega (PlatformConfigSection) |
| Funcionalidades | Sparkles | Roadmap de features |

## Layout

Mesmo padrao do `DashboardPage.tsx`:
- Sidebar escura fixa a esquerda (`#111111`) com 256px de largura
- Logo TrendFood no topo da sidebar
- Info do admin (email) abaixo do logo
- Itens de navegacao com highlight na aba ativa (bg-primary)
- Botao "Sair" no rodape da sidebar
- No mobile: sidebar oculta com botao hamburguer no header
- Overlay escuro ao abrir sidebar no mobile

## Detalhes tecnicos

### Arquivo: `src/pages/AdminPage.tsx`

**Mudancas na funcao `AdminContent`:**

1. Adicionar states: `activeTab` (tipo union "home" | "lojas" | "config" | "features") e `sidebarOpen` (boolean)
2. Definir array de itens de navegacao com key, icon e label
3. Substituir o layout atual (header + main scroll) pelo layout com sidebar:
   - Sidebar escura identica ao Dashboard (logo, info do admin, nav items, botao sair)
   - Header mobile com hamburguer
   - Area de conteudo que renderiza condicionalmente baseado em `activeTab`
4. Mover cada secao para renderizacao condicional:
   - `activeTab === "home"`: KPI Cards + GrowthCharts
   - `activeTab === "lojas"`: Filtros + Grid de lojas + CSV
   - `activeTab === "config"`: PlatformConfigSection
   - `activeTab === "features"`: Feature Roadmap
5. Importar `logoIcon` de `@/assets/logo-icon.png` e icones necessarios (Home, Menu, LogOut)
6. Usar `useAuth` para `signOut` e `useNavigate` para redirecionar apos logout

**Componentes internos (KpiCard, StoreCard, SetupScore, FeatureCard):** permanecem iguais, sem alteracao.

### Nenhuma migration SQL necessaria
Apenas mudanca de layout/UI.

