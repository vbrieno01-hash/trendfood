
# Corrigir banner de trial para assinantes pagos

## Problema
O banner "Você tem X dias restantes do plano Pro grátis!" aparece mesmo para usuarios que ja pagaram pelo plano Pro ou Enterprise. Isso acontece porque a logica de `trialActive` em `usePlanLimits.ts` verifica apenas se `trial_ends_at` esta no futuro, sem considerar se o usuario ja assinou um plano pago.

## Solucao
Ajustar a logica de `trialActive` para considerar que o trial so esta ativo quando:
1. `trial_ends_at` ainda nao expirou **E**
2. O plano atual (`subscription_plan`) ainda e `free`

Assim, quando o webhook da Cakto atualiza o plano para `pro` ou `enterprise`, o banner some automaticamente.

## Detalhes Tecnicos

### Arquivo: `src/hooks/usePlanLimits.ts`
Alterar a linha que define `trialActive`:

**Antes:**
```ts
const trialActive = !!trialEndsAt && trialEndsAt > now;
```

**Depois:**
```ts
const trialActive = !!trialEndsAt && trialEndsAt > now && rawPlan === "free";
```

Da mesma forma, ajustar `trialExpired` para so considerar expirado se o plano ainda for free (ja esta assim no DashboardPage, mas vale garantir na origem):

**Antes:**
```ts
const trialExpired = !!trialEndsAt && trialEndsAt <= now;
```

**Depois:**
```ts
const trialExpired = !!trialEndsAt && trialEndsAt <= now && rawPlan === "free";
```

### Resultado
- Usuario no trial (plano `free` + `trial_ends_at` no futuro): banner aparece normalmente
- Usuario que pagou Pro/Enterprise: banner some, independente do valor de `trial_ends_at`
- Trial expirado + plano free: banner de expiracao aparece
- Trial expirado + plano pago: nenhum banner aparece
