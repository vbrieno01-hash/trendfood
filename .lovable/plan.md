

## Plano: Aplicar tema Premium em todas as abas restantes

### Abas já atualizadas
HomeTab, SettingsTab, BestSellersTab, CouponsTab, KitchenTab, HistoryTab, StockTab, ReportsTab, FeaturesTab, CaixaTab — todas já usam `dashboard-glass`, animações staggered e headers com ícone gradiente.

### Abas que faltam (10 arquivos)
Cada uma receberá o mesmo padrão visual: header com `dashboard-section-icon`, containers `dashboard-glass rounded-2xl`, animações `animate-dashboard-fade-in` com delays staggered, e botões com `shadow-lg shadow-primary/20`.

| Arquivo | Mudanças |
|---------|----------|
| **TablesTab.tsx** | Header com ícone gradiente, lista de mesas em `dashboard-glass`, rows com `dashboard-table-row`, empty state glass |
| **WaiterTab.tsx** | Seções (Prontos, Aguardando PIX, Aguardando Pagamento) com headers glass, cards de pedido com `dashboard-glass` + bordas coloridas por status, animações staggered |
| **MenuTab.tsx** | Header com ícone gradiente, cards de item em `dashboard-glass`, modal de criação/edição mantém funcional, botão "Adicionar" com shadow primary |
| **CourierDashboardTab.tsx** | Header glass, KPI summary cards com `dashboard-glass`, cards de entrega com bordas por status, seção config com glass |
| **StoreProfileTab.tsx** | Cada seção (Identidade, Endereço, PIX, etc.) envolta em `dashboard-glass rounded-2xl`, header principal com ícone gradiente |
| **PrinterTab.tsx** | Seções de config em `dashboard-glass`, header com ícone gradiente |
| **PricingTab.tsx** | Substituir `<Card>` por `dashboard-glass rounded-2xl`, tabela com header `bg-muted/30` |
| **GuideTab.tsx** | Header com ícone gradiente, accordion items com `dashboard-glass` em vez de `bg-card` |
| **SubscriptionTab.tsx** | Card de plano atual em `dashboard-glass`, seção de pagamentos glass |
| **ReferralSection.tsx** | Card principal em `dashboard-glass`, stats cards com glass, bonus history glass |

### Padrão aplicado (consistente com abas já feitas)

```
// Header padrão
<div className="flex items-center gap-3 animate-dashboard-fade-in">
  <div className="dashboard-section-icon">
    <Icon className="w-5 h-5" />
  </div>
  <h2 className="font-bold text-foreground text-xl">Título</h2>
</div>

// Container padrão
<div className="dashboard-glass rounded-2xl p-4 animate-dashboard-fade-in dash-delay-1">
  ...
</div>
```

### O que NÃO muda
- Nenhuma lógica de negócio
- Nenhuma prop ou hook
- Apenas classes CSS e wrappers visuais

Total: 10 arquivos, mudanças puramente visuais.

