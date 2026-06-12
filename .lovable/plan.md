## Problema

Quando o plano Pro/Enterprise vence, o campo `subscription_plan` no banco continua "pro" (só o `effectivePlan` vira "free" via `usePlanLimits`). Em todas as telas de planos, o `PlanCard` é renderizado com `currentPlan = (subscription_plan === plan.key)`, que retorna `true` — então o card mostra o botão **"Plano atual"** desabilitado e o lojista não consegue clicar para renovar/reassinar.

Isso acontece em 3 lugares:
- `src/components/dashboard/SubscriptionTab.tsx` (aba Assinatura no dashboard)
- `src/components/dashboard/UpgradeDialog.tsx` (modal de upgrade que abre de qualquer locked feature)
- `src/pages/PricingPage.tsx` (página pública /planos)

## Solução

Tratar assinatura expirada como **não sendo "plano atual"**, liberando o botão de assinar/renovar normalmente em todos os cards pagos.

### Regra única
```ts
const subscriptionExpired = isPaid && trial_ends_at && new Date(trial_ends_at) <= new Date();
const isSamePlan = currentPlan === plan.key && !subscriptionExpired;
```

Quando expirado:
- `isSamePlan` vira `false` → some o badge verde "Seu plano" e o botão desabilitado
- `onSelect` volta a ser passado → botão fica clicável (texto "Renovar agora" / "Assinar agora" / oferta promo)
- Promo do 1º mês continua respeitando `promoEligible` (já controlado por `used_first_month_promo`)

### Mudanças por arquivo

**`SubscriptionTab.tsx`** — já tem `planLimits.subscriptionExpired`; aplicar na linha 455:
- `isSamePlan = currentPlan === plan.key && !planLimits.subscriptionExpired`
- CTA do plano que expirou usa "Renovar agora" em vez de "Plano atual"

**`UpgradeDialog.tsx`** — derivar `subscriptionExpired` a partir da `organization` recebida (ou aceitar prop), aplicar no `isSamePlan` da linha 173.

**`PricingPage.tsx`** — mesma lógica na linha 267, usando `organization.trial_ends_at` + `subscription_plan`.

### Fora de escopo
- Não muda fluxo de pagamento (`handleSubscribe`, edge functions, MP)
- Não muda `usePlanLimits` nem triggers SQL
- Não mexe em layout/cor dos cards, só na lógica de `isSamePlan` e CTA
- Não muda data preservation (memo `data-preservation-on-expiration` continua válido)

## Resultado

Lojista com Pro vencido entra em qualquer aba de planos → vê os cards normais com botão **"Renovar agora"** clicável → fluxo de checkout MP roda igual a uma nova assinatura → ao aprovar, `subscription_plan` e `trial_ends_at` são atualizados pelo webhook que já existe.