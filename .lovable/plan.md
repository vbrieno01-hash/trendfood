

## Plano: Adicionar opção de assinatura trimestral

### Como funciona hoje
O sistema usa o Mercado Pago (preapproval/assinatura recorrente). Hoje existem 2 ciclos:
- **Mensal**: cobra a cada 1 mês (`frequency: 1, frequency_type: "months"`)
- **Anual**: cobra a cada 12 meses (`frequency: 12, frequency_type: "months"`)

Os preços ficam na tabela `platform_plans` com colunas `price_cents` (mensal) e `annual_price_cents` (anual).

### Como vai funcionar o trimestral
O trimestral será uma cobrança a cada 3 meses via Mercado Pago, com um pequeno desconto em relação ao mensal (ex: ~10% de economia). O cliente paga 1x e o Mercado Pago cobra automaticamente a cada 3 meses.

### Alterações necessárias

**1. Banco de dados — migração**
- Adicionar coluna `quarterly_price_cents` na tabela `platform_plans` (integer, nullable, default null)
- Atualizar os planos existentes com os valores trimestrais desejados

**2. `supabase/functions/create-mp-subscription/index.ts`**
- Buscar `quarterly_price_cents` junto com os outros campos do plano
- Tratar `billing === "quarterly"`: usar `frequency: 3, frequency_type: "months"` e o preço trimestral
- Salvar `billing_cycle: "quarterly"` na organização

**3. `supabase/functions/mp-webhook/index.ts`**
- Nos cálculos de `renewalDays`, adicionar caso para `quarterly`: ~95 dias (3 meses + margem)

**4. `src/components/checkout/CardPaymentForm.tsx`**
- Expandir tipo `billing` de `"monthly" | "annual"` para `"monthly" | "quarterly" | "annual"`

**5. `src/components/dashboard/SubscriptionTab.tsx`**
- Trocar o toggle Mensal/Anual por 3 opções (botões ou tabs): Mensal, Trimestral, Anual
- Calcular e exibir preço trimestral nos cards
- Passar `billing="quarterly"` ao `CardPaymentForm` quando selecionado
- Mostrar economia do trimestral (ex: "Economia de 10%")

**6. `src/pages/PricingPage.tsx`**
- Mesmo ajuste do toggle: 3 opções de ciclo
- Exibir preço trimestral e equivalente mensal

**7. `src/components/dashboard/UpgradeDialog.tsx`**
- Adicionar suporte ao ciclo trimestral no seletor e no cálculo de preço

**8. `src/hooks/useAuth.tsx`**
- Já suporta `billing_cycle` como string, sem mudança necessária

### Resumo visual do seletor
```text
[ Mensal ]  [ Trimestral (-10%) ]  [ Anual (-17%) ]
```

### Impacto
- 1 migração de banco (adicionar coluna)
- 6 arquivos alterados no frontend + 2 edge functions
- Zero quebra de funcionalidade existente — mensal e anual continuam iguais

