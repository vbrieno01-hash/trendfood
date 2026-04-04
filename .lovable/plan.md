

## Plano: Padronizar seletor de ciclo de cobrança em todas as páginas

### Problema
A página principal (`Index.tsx`) ainda usa o antigo toggle Switch com apenas "Mensal / Anual", sem a opção Trimestral. Além disso, o painel admin de configuração de planos (`PlansConfigSection.tsx`) não tem campo para editar o preço trimestral.

As páginas `/planos` (PricingPage), `SubscriptionTab` e `UpgradeDialog` já estão corretas com os 3 botões.

### Alterações

**1. `src/pages/Index.tsx`**
- Trocar o `Switch` + labels por seletor de 3 botões idêntico ao das outras páginas (Mensal, Trimestral -10%, Anual -17%)
- Substituir `isAnnual: boolean` por `selectedBilling: BillingCycle` (monthly/quarterly/annual)
- Atualizar lógica de exibição de preço para incluir `quarterly_price_cents`
- Remover import do `Switch`

**2. `src/components/admin/PlansConfigSection.tsx`**
- Adicionar campo "Preço Trimestral (centavos)" no formulário de edição/criação de plano
- Incluir `quarterly_price_cents` no `PlanRow`, no form state, e no `upsert`
- Exibir o valor trimestral na listagem ao lado do mensal

### Visual do seletor (mesmo das outras páginas)
```text
[ Mensal ]  [ Trimestral -10% ]  [ Anual -17% ]
```

### Impacto
- 2 arquivos alterados
- Zero mudanças no banco — a coluna `quarterly_price_cents` já existe
- Todas as 5 telas de planos ficam com o mesmo padrão visual e funcional

