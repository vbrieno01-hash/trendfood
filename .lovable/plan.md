

## Plano: Redesign Premium do Painel Admin — Nível Dashboard

### O que muda

**1. Visual da Sidebar (`AdminPage.tsx`)**
- Trocar `logoIcon` por `logoDashboard` (mesmo logo do dashboard do lojista)
- Adicionar indicador "ao vivo" com pulsação verde no badge admin (mostrando que está conectado à plataforma)
- Sidebar com gradiente mais rico e sutil glow na borda direita
- Ícones de nav com micro-animação no hover (scale + color transition)

**2. Dashboard Home — Visual Premium**
- Cards KPI com gradiente de fundo sutil (não apenas borda), glassmorphism leve
- Adicionar animação de entrada (fade-in + slide-up) nos cards e seções
- Número grande com animação de contagem (count-up effect via CSS)
- Indicador "ao vivo" pulsante no header: "🟢 Plataforma Online"
- Saudação com avatar do admin (primeira letra do email)
- Quick actions com ícones mais coloridos e hover com scale

**3. Tabela de Assinantes — Upgrade Visual**
- Rows com hover mais rico (bg-gradient sutil)
- Avatar colorido maior com sombra
- Coluna de "Status" com dot pulsante para ativos
- Footer da tabela com gradiente laranja sutil

**4. Store Cards — Mais Vivos**
- Hover com elevação mais dramática (shadow-xl + translate-y)
- Setup score bar com animação de preenchimento
- Badge de status com dot pulsante para lojas ativas
- Botões de ação com micro-animações

**5. Gráficos (`GrowthCharts.tsx`)**
- Cards dos gráficos com glassmorphism (backdrop-blur + bg semi-transparente)
- Animação suave de entrada
- Valor atual destacado no canto do card (último ponto do gráfico)

**6. Mobile — Mais Polido**
- Header mobile com gradiente laranja sutil e shadow
- Transição mais suave do menu (backdrop-blur no overlay)

**7. CSS Animations (`index.css`)**
- Adicionar keyframes para fade-in, slide-up, count-up
- Classe utilitária `animate-fade-in` e `animate-slide-up`
- Pulse suave para indicadores "ao vivo"

### Arquivos afetados
- `src/pages/AdminPage.tsx` — visual completo (sidebar, KPIs, tabela, store cards)
- `src/components/admin/GrowthCharts.tsx` — glassmorphism + valor atual
- `src/index.css` — novas animações CSS

### O que NÃO muda
- Toda a lógica de negócio (KPIs, filtros, ativação, referral bonus)
- Componentes de sub-tabs (PlansConfig, ErrorLogs, ActivationLogs, etc.)
- Rotas e autenticação

