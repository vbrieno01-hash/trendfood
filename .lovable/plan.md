
## Pedido

Bug: plano Free deveria ter limite de itens, mas o lojista consegue passar dele. Mudar limite de **20 → 30** e bloquear de verdade quando atingir.

## Investigação

`src/hooks/usePlanLimits.ts` linha ~91: `menuItemLimit: effectivePlan === "free" ? 20 : null` — limite é só **informacional**, não há bloqueio real no fluxo de criação.

Preciso achar onde itens são criados no `MenuTab` pra ver se existe (ou não) checagem.
