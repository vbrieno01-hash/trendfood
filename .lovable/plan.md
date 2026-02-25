

# Plano: Expiração automática para planos pagos

## Situação atual

Você configurou cobrança **mensal recorrente** no gateway. Cada vez que o cliente paga, o gateway chama o webhook e o sistema estende o acesso por +30 dias (campo `trial_ends_at`).

**O problema**: o `usePlanLimits` só verifica a data de expiração quando o plano é `free`. Se o plano é `pro` ou `enterprise`, ele **ignora a data** — então uma vez ativado, nunca expira, mesmo se o cliente parar de pagar.

## Como vai funcionar depois da mudança

```text
┌─────────────────────────────────────────────────────┐
│  Cliente paga no gateway (mensal)                    │
│         ↓                                            │
│  Gateway chama webhook → +30 dias em trial_ends_at   │
│         ↓                                            │
│  Sistema libera pro/enterprise por 30 dias           │
│         ↓                                            │
│  Passou 30 dias sem novo pagamento?                  │
│    SIM → Sistema trata como plano Free (bloqueado)   │
│    NÃO → Webhook renovou, tudo liberado              │
└─────────────────────────────────────────────────────┘
```

Pagou = liberado. Não pagou = bloqueado. Automático.

## O que muda

### `src/hooks/usePlanLimits.ts` (único arquivo)

Hoje (linha 47-48):
```typescript
const trialActive = !!trialEndsAt && trialEndsAt > now && rawPlan === "free";
const trialExpired = !!trialEndsAt && trialEndsAt <= now && rawPlan === "free";
```

Vai mudar para checar a data para **todos** os planos (exceto `lifetime`):

```typescript
// Para planos pagos: trial_ends_at funciona como data de expiração
const isPaid = rawPlan === "pro" || rawPlan === "enterprise";
const subscriptionExpired = isPaid && !!trialEndsAt && trialEndsAt <= now;

// Trial continua funcionando igual para plano free
const trialActive = !!trialEndsAt && trialEndsAt > now && rawPlan === "free";
const trialExpired = !!trialEndsAt && trialEndsAt <= now && rawPlan === "free";

// Se plano pago expirou, trata como free
const effectivePlan: Plan = rawPlan === "lifetime" 
  ? "lifetime" 
  : subscriptionExpired 
    ? "free" 
    : trialActive 
      ? "pro" 
      : rawPlan;
```

Lógica:
- **`lifetime`**: nunca expira
- **`pro`/`enterprise`**: se `trial_ends_at` passou, volta para `free` automaticamente
- **`free` com trial**: funciona igual ao que já existe
- Quando o gateway envia webhook de renovação, estende +30 dias e volta a funcionar

### Nenhuma mudança no webhook

O webhook já faz exatamente o que precisa: atualiza `trial_ends_at` com +30 dias a cada pagamento. Só faltava o frontend respeitar essa data para planos pagos.

## Seção técnica

```text
EDIT: src/hooks/usePlanLimits.ts
  - Linha 47-53: Adicionar lógica de expiração para planos pro/enterprise
  - Adicionar flag subscriptionExpired e subscriptionDaysLeft ao retorno
  - effectivePlan volta para "free" se plano pago expirou
```

