
## Plano: Aplicar tema Premium Live em 10 abas do Dashboard

Vou aplicar o padrão glassmorphism (`dashboard-glass`) e animações staggered em todas as abas pendentes.

### Padrão Visual a Aplicar

```tsx
// Header premium com ícone gradiente
<div className="flex items-center gap-3 animate-dashboard-fade-in">
  <div className="dashboard-section-icon">
    <Icon className="w-5 h-5" />
  </div>
  <div>
    <h1 className="text-xl font-bold">Título</h1>
    <p className="text-sm text-muted-foreground">Subtítulo</p>
  </div>
</div>

// Containers com glass effect
<div className="dashboard-glass rounded-2xl p-4 animate-dashboard-fade-in dash-delay-1">
  {/* conteúdo */}
</div>
```

### Arquivos e Mudanças

| Arquivo | Mudanças |
|---------|----------|
| **TablesTab.tsx** | Header com `Grid3X3` + section-icon, lista em `dashboard-glass`, empty state glass |
| **PricingTab.tsx** | Remover `Card/CardContent`, usar `dashboard-glass` nos controls e table containers |
| **WaiterTab.tsx** | Seção headers com section-icon, cards de pedido já têm bordas coloridas (manter), envolver seções em glass |
| **MenuTab.tsx** | Header premium, seção global addons e lista de itens em glass containers |
| **CourierDashboardTab.tsx** | Header com `Bike` + section-icon, KPIs e configs em `dashboard-glass`, remover `Card/CardContent` |
| **StoreProfileTab.tsx** | Seções em glass containers, header premium |
| **PrinterTab.tsx** | Já usa `rounded-xl border`, converter para `dashboard-glass` |
| **GuideTab.tsx** | Header premium, accordion items em glass background |
| **SubscriptionTab.tsx** | Card de status atual em `dashboard-glass`, header com section-icon |
| **ReferralSection.tsx** | Header com section-icon, referral card e stats em `dashboard-glass` |

### Detalhes Técnicos

1. **Remover imports não usados**: `Card`, `CardContent` em arquivos que passarão a usar apenas classes CSS
2. **Manter funcionalidade**: Não alterar lógica, apenas visual
3. **Animações staggered**: `dash-delay-1` até `dash-delay-4` para containers em sequência
4. **Consistência**: Mesmo padrão de header usado nas abas já atualizadas (HomeTab, SettingsTab, etc.)

### Resultado Esperado
Dashboard 100% consistente com identidade "Premium Live" — glassmorphism, animações suaves e indicadores visuais modernos em todas as 10 abas.
