

## Plano: Corrigir fluxo de pagamento para respeitar ciclo de cobrança (mensal/trimestral/anual)

### Problemas encontrados

Ao analisar o código, encontrei **5 problemas** que fazem os planos não funcionarem corretamente quando o ciclo não é mensal:

1. **Preço errado no PIX/Cartão** — A edge function `create-mp-payment` só busca `price_cents` do banco. Quando o cliente seleciona trimestral ou anual, o Mercado Pago recebe o preço mensal em vez do correto.

2. **Prazo sempre 30 dias** — Tanto `create-mp-payment` (cartão aprovado) quanto `check-subscription-pix` (PIX aprovado) definem `trial_ends_at` como +30 dias, independente do ciclo. Trimestral deveria ser ~93 dias, anual ~370 dias.

3. **`billing_cycle` não é salvo** — Nenhuma das duas functions atualiza o campo `billing_cycle` da organização após o pagamento.

4. **Mensagem fixa "30 dias"** — O `PixPaymentTab` mostra "O pagamento via PIX ativa o plano por 30 dias" hardcoded, mesmo para trimestral/anual.

5. **Promo só para mensal mas preço não considera ciclo** — A lógica de promo está correta (só mensal), mas o preço base usado é sempre `price_cents`.

### Alterações

**1. `supabase/functions/create-mp-payment/index.ts`**
- Buscar `price_cents, quarterly_price_cents, annual_price_cents` do plano
- Calcular `finalCents` baseado no `billing`: quarterly usa `quarterly_price_cents`, annual usa `annual_price_cents`
- Calcular `renewalDays`: monthly=30, quarterly=93, annual=370
- Salvar `billing_cycle` e usar `renewalDays` no `trial_ends_at` quando cartão aprovado
- Incluir `billing` no `metadata` do pagamento MP

**2. `supabase/functions/check-subscription-pix/index.ts`**
- Ler `billing` do `metadata` do pagamento MP (já está no metadata após fix acima)
- Calcular `renewalDays` baseado no billing
- Salvar `billing_cycle` e usar `renewalDays` no `trial_ends_at`

**3. `src/components/checkout/PixPaymentTab.tsx`**
- Trocar mensagem hardcoded por mensagem dinâmica baseada na prop `billing`:
  - monthly: "30 dias"
  - quarterly: "90 dias"  
  - annual: "12 meses"

### Impacto
- 2 edge functions + 1 componente frontend
- Zero mudanças no banco de dados
- Corrige cobranças PIX e cartão para todos os ciclos

