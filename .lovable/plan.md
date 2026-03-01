

## Plano: Toggle Mensal/Anual na Tela de Planos

### Resumo
Adicionar toggle Mensal/Anual na PricingPage e UpgradeDialog, com preços anuais com desconto, badge de economia, e bônus de indicação de 30 dias para assinaturas anuais.

### 1. Banco de dados - Adicionar colunas anuais em `platform_plans`

Adicionar `annual_price_cents` na tabela `platform_plans` para armazenar os preços anuais:
- Pro: 99000 (R$ 990)
- Enterprise: 249000 (R$ 2.490)

### 2. `src/pages/PricingPage.tsx`

- Adicionar estado `isAnnual` (boolean, default false)
- Renderizar toggle Switch acima dos cards com labels "Mensal" / "Anual (2 Meses Grátis)"
- Quando anual:
  - Exibir preço anual formatado (ex: "R$ 990")
  - Period muda para "/ano"
  - Subtexto: "Equivalente a R$ 82,50/mês"
  - Badge extra: "ECONOMIA DE 17%"
- Passar `billing: "annual" | "monthly"` para o CardPaymentForm
- No diálogo de confirmação, ajustar texto para refletir "/ano"

### 3. `src/components/pricing/PlanCard.tsx`

- Adicionar prop opcional `subtitle` para exibir "Equivalente a R$ XX/mês"
- Adicionar prop opcional `savingsBadge` para o badge "ECONOMIA DE 17%"

### 4. `src/components/checkout/CardPaymentForm.tsx`

- Adicionar prop opcional `billing?: "monthly" | "annual"`
- Passar `billing` ao chamar `create-mp-subscription`

### 5. `supabase/functions/create-mp-subscription/index.ts`

- Aceitar param `billing` no body
- Se `billing === "annual"`: usar `annual_price_cents` do plano, `frequency: 12, frequency_type: "months"` ou `frequency: 1, frequency_type: "years"`
- Ajustar `reason` para indicar "Anual"

### 6. `src/components/dashboard/UpgradeDialog.tsx`

- Mesmo toggle Mensal/Anual
- Mesma lógica de preço e badge

### 7. Bônus de indicação 30 dias para anuais

- No `mp-webhook`, `universal-activation-webhook` e `AdminPage.tsx`:
  - Verificar se o plano ativado tem billing anual (via campo no corpo ou detectando o valor da assinatura)
  - Se anual, usar `bonus_days: 30` em vez de `10`
- Opção mais simples: guardar `billing_cycle` na tabela `organizations` (novo campo) e consultar nos hooks de referral

### 8. Novo campo `billing_cycle` em `organizations`

Adicionar coluna `billing_cycle text DEFAULT 'monthly'` para rastrear se a assinatura é mensal ou anual. Usado para:
- Determinar bônus de indicação (10 vs 30 dias)
- Exibir corretamente no dashboard

### Detalhes técnicos

**Migration SQL:**
```sql
ALTER TABLE platform_plans ADD COLUMN annual_price_cents integer DEFAULT 0;
ALTER TABLE organizations ADD COLUMN billing_cycle text NOT NULL DEFAULT 'monthly';
UPDATE platform_plans SET annual_price_cents = 99000 WHERE key = 'pro';
UPDATE platform_plans SET annual_price_cents = 249000 WHERE key = 'enterprise';
```

**Arquivos a editar:**
1. `src/pages/PricingPage.tsx` - toggle + lógica anual
2. `src/components/pricing/PlanCard.tsx` - props subtitle/savingsBadge
3. `src/components/checkout/CardPaymentForm.tsx` - prop billing
4. `src/components/dashboard/UpgradeDialog.tsx` - toggle + lógica anual
5. `supabase/functions/create-mp-subscription/index.ts` - billing anual
6. `supabase/functions/mp-webhook/index.ts` - bonus_days 30 para anual
7. `supabase/functions/universal-activation-webhook/index.ts` - bonus_days 30 para anual
8. `src/pages/AdminPage.tsx` - bonus_days baseado em billing_cycle

