

## Plano: Propagar promoção "1º mês pela metade" para TODOS os locais

### Problema
A promoção só aparece na `PricingPage` e no `UpgradeDialog` (quando chamado do banner do Dashboard). Dois lugares não mostram a promo:

1. **`SubscriptionTab`** (aba "Assinatura / Plano" dentro do dashboard) — renderiza os PlanCards sem `promoPrice`/`originalPrice` e sem `promo` no CardPaymentForm
2. **`UpgradePrompt`** (tela de bloqueio de features como Cupons, KDS, Estoque, etc.) — não passa `promoEligible` para o `UpgradeDialog`

### O que será feito

**1. `src/components/dashboard/SubscriptionTab.tsx`**
- Importar `usePlanLimits` (já importa) e extrair `promoEligible` dele
- Na renderização dos PlanCards: quando `promoEligible && !isAnnual && plan.priceCents > 0`, passar `promoPrice`, `originalPrice`, `subtitle` promo e CTA "🔥 Aproveitar oferta"
- No `CardPaymentForm`: passar `promo={promoEligible && !isAnnual}`

**2. `src/components/dashboard/UpgradePrompt.tsx`**
- Aceitar nova prop opcional `promoEligible?: boolean`
- Repassar para `UpgradeDialog`

**3. `src/pages/DashboardPage.tsx`**
- Passar `promoEligible={planLimits.promoEligible}` em todas as instâncias de `<UpgradePrompt>`

### Arquivos alterados
- `src/components/dashboard/SubscriptionTab.tsx` — adicionar lógica promo nos PlanCards e CardPaymentForm
- `src/components/dashboard/UpgradePrompt.tsx` — aceitar e repassar `promoEligible`
- `src/pages/DashboardPage.tsx` — passar `promoEligible` para cada `UpgradePrompt`

