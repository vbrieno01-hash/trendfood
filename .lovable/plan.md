

## Restringir QR Code ao plano Pro ou superior

### Abordagem

Passar `planLimits` e dados da organização para `StoreProfileTab`, e envolver a seção do QR Code (linhas 938-1008) com uma condicional: se o plano efetivo for `free`, mostrar o `UpgradePrompt` no lugar.

### Alterações

**1. `src/pages/DashboardPage.tsx` (linha 973)**

Passar `effectivePlan`, `orgId` e `currentPlan` para o componente:

```tsx
{activeTab === "profile" && <StoreProfileTab organization={organization} effectivePlan={planLimits.effectivePlan} />}
```

**2. `src/components/dashboard/StoreProfileTab.tsx`**

- Adicionar `effectivePlan` à interface de props (aceitar `string`, default `"free"`)
- Importar `UpgradePrompt`
- Na seção 7 (QR Code, linhas 938-1008), envolver com condicional:
  - Se `effectivePlan === "free"` → renderizar `UpgradePrompt` com título "QR Code do Cardápio" e descrição sobre necessidade do plano Pro
  - Caso contrário → renderizar o cartão QR normalmente

