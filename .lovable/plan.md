

## Plano: Adicionar toggle Mensal/Anual nos locais que faltam

Identifiquei que o toggle de faturamento anual existe apenas em 2 dos 4 locais que mostram planos:

| Local | Toggle Anual | Status |
|---|---|---|
| `PricingPage.tsx` (/planos) | Sim | OK |
| `UpgradeDialog.tsx` (popup upgrade) | Sim | OK |
| `SubscriptionTab.tsx` (dashboard) | **Não** | Corrigir |
| `Index.tsx` (landing page) | **Não** | Corrigir |

### Correções

**1. `SubscriptionTab.tsx`** — Adicionar toggle Mensal/Anual
- Adicionar estado `isAnnual` e o componente `Switch` (Mensal ↔ Anual)
- Atualizar `mapPlanRow` para incluir `annual_price_cents`
- Mostrar preço anual nos `PlanCard` quando toggle ativo (com subtitle e savings badge)
- Passar `billing` e preço correto ao `CardPaymentForm`

**2. `Index.tsx`** — Adicionar toggle Mensal/Anual na seção de planos
- Adicionar estado `isAnnual` e o componente `Switch` entre o subtítulo e os cards
- Atualizar os `PlanCard` para mostrar preço anual quando toggle ativo (com subtitle e savings badge)
- O CTA continua sendo "Ver detalhes" apontando para `/planos`, sem mudança funcional

### Detalhes Técnicos
- Reutilizar o mesmo padrão visual do toggle já existente em `PricingPage.tsx` e `UpgradeDialog.tsx`
- A query de `platform_plans` já retorna `annual_price_cents`, só precisa ser utilizado nos componentes
- Nenhuma alteração de banco de dados ou edge function necessária

