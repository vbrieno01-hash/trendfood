## Restaurar promo de 50% no 1º mês para todas as lojas

**Problema:** O badge "🔥 1º MÊS COM 50% OFF" sumiu para lojas em trial Pro ativo e em Free puro. Só aparecia depois do trial expirar.

**Causa:** Filtro `trialExpired && rawPlan === "free"` em `usePlanLimits.ts` e lógica equivalente em `PricingPage.tsx`.

### Mudanças

**1. `src/hooks/usePlanLimits.ts` (linha ~88)**
- Trocar `const promoEligible = trialExpired && rawPlan === "free" && !usedPromo;`
- Por `const promoEligible = !usedPromo;`

**2. `src/pages/PricingPage.tsx` (linha ~111)**
- Garantir `const promoEligible = !(organization as any)?.used_first_month_promo;` (sem condicionar a trial/plano).

### Garantias mantidas
- Promo só aplica em **plano mensal** (filtros existentes `selectedBilling === "monthly"` permanecem).
- Plano Free (price 0), trimestral, anual, lifetime e enterprise **nunca** mostram promo.
- Após 1º pagamento mensal aprovado, `mp-webhook` marca `used_first_month_promo = true` → badge desaparece para sempre **só para essa loja**.
- Vale para lojas antigas e novas automaticamente (regra ligada a coluna do banco).

### Resultado visível
Enquanto `used_first_month_promo = false`, o badge aparece em todos os pontos (landing pricing, SubscriptionTab, UpgradeDialog, UpgradePrompt) — em trial Pro, Free puro ou Free expirado.
