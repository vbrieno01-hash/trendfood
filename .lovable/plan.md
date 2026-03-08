

## Plano: Redesign futurista do Dashboard do lojista (estilo Admin Premium)

### Contexto
O painel admin usa um visual "Premium Live" com glassmorphism, gradientes, animações staggered e cards KPI estilizados. O dashboard do lojista usa um estilo funcional mais simples. O objetivo é aplicar a mesma linguagem visual do admin ao dashboard inteiro.

### Estratégia
Fazer em **duas fases** para não quebrar funcionalidades. A mudança é puramente visual — nenhuma lógica de negócio será alterada.

---

### Fase 1 — Foundation (CSS + HomeTab + DashboardPage shell)

**1. `src/index.css`** — Adicionar variáveis e utilitários para o dashboard:
- Classe `.dashboard-glass` (igual ao `.admin-glass` mas reutilizável)
- Animações de entrada (`dashboard-fade-in`, `dashboard-slide-up`) reutilizando as mesmas keyframes do admin
- Classes de delay staggered para dashboard

**2. `src/pages/DashboardPage.tsx`** — Sidebar e shell premium:
- Sidebar: adicionar o glow border lateral (gradiente sutil na borda direita), melhorar o gradiente de fundo para `linear-gradient(180deg, #0c0c0c 0%, #18110a 40%, #110e08 100%)` (igual ao admin)
- Logo area: adicionar efeito `ring-1 ring-white/10 group-hover:ring-primary/40` e label "Painel"
- Mobile header: adicionar indicador live pulsante
- Nav items: adicionar animação hover mais rica com `hover:scale-[1.02]`
- Overlay mobile: blur backdrop (`bg-black/60 backdrop-blur-sm`)

**3. `src/components/dashboard/HomeTab.tsx`** — Redesign completo:
- Greeting com avatar gradiente (como admin) + indicador live "Loja Online"
- KPI cards com glassmorphism (`dashboard-glass`), ícone com fundo gradiente, animações staggered
- Hero de faturamento: manter mas adicionar glassmorphism e padrão de dots mais sutil
- Quick Summary (Pedidos Ativos, Mesas, Estoque): converter para estilo glassmorphism
- Charts: bordas mais suaves, tooltip com glassmorphism
- Pause toggle: estilo glassmorphism

---

### Fase 2 — Tabs operacionais e de gestão

**4. Tabs com tabelas** (`HistoryTab`, `CouponsTab`, `BestSellersTab`, `StockTab`, `ReportsTab`):
- Substituir `<Card>` por divs com classe `dashboard-glass rounded-2xl`
- Tabelas: header com `bg-muted/30`, rows com `hover:bg-gradient-to-r hover:from-primary/[0.03]`
- Badges de status com cores vibrantes em fundo transparente

**5. Tabs com formulários** (`MenuTab`, `StoreProfileTab`, `SettingsTab`, `PrinterTab`, `PricingTab`):
- Wraps de seção com `dashboard-glass rounded-2xl p-6`
- Headers de seção com ícone colorido + título bold
- Botões primários com `shadow-lg shadow-primary/20`

**6. Tabs operacionais** (`KitchenTab`, `WaiterTab`, `TablesTab`, `CourierDashboardTab`, `CaixaTab`):
- Cards de pedido/mesa com glassmorphism e bordas coloridas por status
- Status badges pulsantes para "em preparo"
- Cards com animação de entrada staggered

**7. Tabs informativas** (`FeaturesTab`, `GuideTab`, `SubscriptionTab`, `ReferralSection`):
- Cards com gradiente sutil e ícones coloridos
- CTAs com hover scale

---

### Arquivos modificados (total: ~18 arquivos)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/index.css` | Novas classes utilitárias dashboard-glass, animações |
| `src/pages/DashboardPage.tsx` | Sidebar premium, mobile header, overlay blur |
| `src/components/dashboard/HomeTab.tsx` | Redesign completo com glassmorphism e KPIs |
| `src/components/dashboard/HistoryTab.tsx` | Tabela premium com glass cards |
| `src/components/dashboard/KitchenTab.tsx` | Cards de pedido com glass + status pulsante |
| `src/components/dashboard/WaiterTab.tsx` | Cards de pedido glass |
| `src/components/dashboard/TablesTab.tsx` | Cards de mesa glass |
| `src/components/dashboard/MenuTab.tsx` | Seções glass, cards de item |
| `src/components/dashboard/CaixaTab.tsx` | Glass cards financeiros |
| `src/components/dashboard/CouponsTab.tsx` | Tabela glass |
| `src/components/dashboard/BestSellersTab.tsx` | Cards glass com ranking |
| `src/components/dashboard/StockTab.tsx` | Tabela glass |
| `src/components/dashboard/ReportsTab.tsx` | Charts e tabelas glass |
| `src/components/dashboard/CourierDashboardTab.tsx` | Cards glass |
| `src/components/dashboard/SettingsTab.tsx` | Seções glass |
| `src/components/dashboard/StoreProfileTab.tsx` | Formulário glass |
| `src/components/dashboard/FeaturesTab.tsx` | Cards com gradiente |
| `src/components/dashboard/SubscriptionTab.tsx` | Cards premium |

### Princípios de design
- **Glassmorphism**: fundo semi-transparente com blur, bordas sutis
- **Gradientes**: ícones e destaques com gradientes coloridos
- **Animações**: entrada staggered suave, hover scale, status pulsante
- **Consistência**: mesma linguagem visual do admin em todas as telas
- **Responsivo**: manter mobile-first, apenas visual muda

