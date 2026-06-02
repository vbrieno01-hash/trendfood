## Problema

A tabela V8 atual mostra planos errados (Mensal R$79, Vitalício R$999, Add-ons) que não batem com o PDF oficial. A tabela correta tem **6 planos: Pro + Enterprise × Mensal/Trimestral/Anual**.

## Tabela correta (PDF)

| Plano | Preço | À Vista | 3x cada |
|---|---|---|---|
| Pro Mensal | R$ 99,00 | 30% | 25% |
| Pro Trimestral | R$ 267,00 | 20% | 15% |
| Pro Anual | R$ 990,00 | 15% | 10% |
| Enterprise Mensal | R$ 249,00 | 25% | 12% |
| Enterprise Trimestral | R$ 672,00 | 15% | 12% |
| Enterprise Anual | R$ 2.490,00 | 10% | 12% |

## Mudanças

1. **Migration SQL** — limpar `affiliate_commission_tiers` e reinserir as 6 linhas corretas com:
   - `plan_key`: `pro` / `enterprise`
   - `cycle`: `monthly` / `quarterly` / `yearly`
   - `label`: ex. "Pro Mensal R$ 99"
   - `upfront_pct` / `installment_pct` conforme tabela
   - `sort_order` 1..6

2. **Edge function `telegram-affiliate-webhook`** (e qualquer outro lugar que faça lookup de tier) — garantir que o match seja por `(plan_key, cycle)` usando os novos valores. Verificar o código atual antes de editar.

3. **UI (`TiersGrid.tsx`)** — nenhuma mudança estrutural; ela apenas lista o que vem do banco. Os labels novos vão aparecer automaticamente.

4. **Sem mexer** em `platform_plans` (fonte de verdade de preços já existente), `ReferralsTab`, nem nas metas já criadas (as % ficam congeladas em `tier_upfront_pct`/`tier_installment_pct` por meta).

## Fora do escopo

- Lógica de cálculo de comissão (já correta — usa o snapshot na meta).
- Backend de pagamento dia 5.
