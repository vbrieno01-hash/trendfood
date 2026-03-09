
## Plano: Corrigir erro e completar tema Premium nas abas restantes

### Diagnóstico
O erro mostrado na imagem é um erro de runtime do React. Verificando o estado atual:

**Abas com `dashboard-glass` aplicado (✅ ok):**
- HomeTab, SettingsTab, BestSellersTab, CouponsTab, KitchenTab, HistoryTab, StockTab, ReportsTab, FeaturesTab, CaixaTab

**Abas ainda sem o tema premium (❌ pendentes):**
- TablesTab.tsx
- WaiterTab.tsx  
- MenuTab.tsx
- CourierDashboardTab.tsx
- StoreProfileTab.tsx
- PrinterTab.tsx
- PricingTab.tsx
- GuideTab.tsx
- SubscriptionTab.tsx
- ReferralSection.tsx

O erro pode ter sido causado por uma edição incompleta nas mensagens anteriores (que foram apenas planejadas mas não executadas).

### Solução
Aplicar o tema premium em todas as 10 abas restantes com o padrão:

```tsx
// Header com ícone gradiente
<div className="flex items-center gap-3 animate-dashboard-fade-in">
  <div className="dashboard-section-icon">
    <Icon className="w-5 h-5" />
  </div>
  <h2 className="font-bold text-foreground text-xl">Título</h2>
</div>

// Containers glass
<div className="dashboard-glass rounded-2xl p-4 animate-dashboard-fade-in dash-delay-1">
  ...
</div>
```

### Arquivos a editar
| Arquivo | Mudanças principais |
|---------|---------------------|
| TablesTab.tsx | Header com ícone, lista em `dashboard-glass`, empty state glass |
| WaiterTab.tsx | Cards de pedido com `dashboard-glass` + bordas por status |
| MenuTab.tsx | Header premium, cards de item em glass |
| CourierDashboardTab.tsx | KPIs glass, cards de entrega com bordas |
| StoreProfileTab.tsx | Seções envolvidas em glass containers |
| PrinterTab.tsx | Config sections em glass |
| PricingTab.tsx | Cards de pricing em glass |
| GuideTab.tsx | Accordion items em glass |
| SubscriptionTab.tsx | Card de plano atual em glass |
| ReferralSection.tsx | Stats e histórico em glass |

### Resultado
Dashboard 100% consistente com estilo glassmorphism + animações staggered em todas as abas.
