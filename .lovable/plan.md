

## Plano: Adicionar `promoEligible` ao UpgradePrompt do QR Code do Cardápio

### Problema
O `UpgradePrompt` na seção "QR Code do Cardápio" dentro de `StoreProfileTab.tsx` (linha 957-962) não passa a prop `promoEligible`, então a promoção de 50% não aparece ali.

### Correção
**`src/components/dashboard/StoreProfileTab.tsx`** (linha ~957-962)
- Adicionar `promoEligible={promoEligible}` ao `UpgradePrompt` do QR Code
- Verificar se `promoEligible` já está disponível no componente via `usePlanLimits` (o hook já é usado, pois `effectivePlan` vem dele)

### Arquivo alterado
- `src/components/dashboard/StoreProfileTab.tsx` — 1 linha adicionada

