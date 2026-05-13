## Backfill das 2 assinaturas Pro pagas

Lançar no ledger `subscription_payments` os 2 pagamentos reais já recebidos com 50% de desconto, usando a data de hoje. Depois disso o painel admin vai mostrar a receita real (R$ 99,00) ao invés do valor cheio (R$ 198,00).

### Lançamentos

| Loja | Plano | Ciclo | Valor | Promo | Fonte |
|---|---|---|---|---|---|
| lanchonetedopastor | pro | monthly | R$ 49,50 | sim | manual |
| WrBurg | pro | monthly | R$ 49,50 | sim | manual |

### O que faço

- Inserir 2 linhas em `public.subscription_payments` via tool de dados (não migração) com:
  - `organization_id` das 2 lojas
  - `amount_cents = 4950`
  - `billing_cycle = 'monthly'`, `plan = 'pro'`
  - `promo_applied = true`
  - `source = 'manual'`
  - `paid_at = now()`
  - `payment_id = 'backfill-50pct-<org_id>-<yyyymm>'` para garantir idempotência
  - `notes = 'Backfill manual: assinatura promo 50%'`

### Resultado

- MRR (últimos 30 dias) no admin passa a refletir R$ 99,00 reais.
- As 7 lojas lifetime ficam fora do ledger (foram cortesia, sem cobrança).
- Cobranças futuras pelo Mercado Pago caem automaticamente no ledger via `mp-webhook` com o valor real cobrado, sem precisar de novo backfill.