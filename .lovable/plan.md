

## Plano: Promoção "Primeiro Mês pela Metade" para reter clientes pós-trial

### Entendi o seguinte
Quando o trial de 7 dias acabar, em vez de só mostrar "trial expirou", exibir uma oferta especial: **primeiro mês pela metade do preço** (Pro: R$ 49,50 / Enterprise: R$ 124,50). Nos cards de plano, o preço original aparece **riscado em vermelho** e o preço promocional aparece em destaque. Depois do primeiro mês pago com desconto, a cobrança recorrente volta ao valor normal automaticamente.

### Como funciona tecnicamente

A API do Mercado Pago permite criar uma assinatura (preapproval) com um valor e depois **atualizar o valor** via PUT. Então:

1. Cria a assinatura com **metade do preço**
2. Após o primeiro pagamento ser confirmado via webhook, atualiza a assinatura para o **preço cheio**

```text
Trial 7 dias → Expira → Banner promo "1º mês pela metade!"
  → Cliente assina Pro por R$ 49,50
  → MP cobra R$ 49,50 no 1º mês
  → Webhook detecta 1º pagamento + flag promo → PUT na assinatura → R$ 99,00/mês
  → 2º mês em diante: preço normal
```

### O que será feito

**1. Banco de dados** — nova coluna na tabela `organizations`
- `used_first_month_promo` (boolean, default false) — impede que o mesmo cliente use a promo duas vezes

**2. Edge Function `create-mp-subscription`**
- Aceitar novo parâmetro `promo: true`
- Quando promo=true e org não usou antes: criar assinatura com `transaction_amount` = metade do preço
- Marcar `used_first_month_promo = true` na org

**3. Edge Function `mp-webhook`**
- No evento de primeiro pagamento aprovado: se `used_first_month_promo = true` e o valor pago é metade do preço do plano, fazer PUT no preapproval atualizando `transaction_amount` para o valor cheio

**4. Componente `PlanCard`**
- Nova prop opcional `promoPrice` (string) e `originalPrice` (string)
- Quando `promoPrice` presente: exibir `originalPrice` riscado em vermelho + `promoPrice` em destaque + badge "🔥 1º MÊS"

**5. Banner pós-trial no Dashboard** (`DashboardPage.tsx`)
- Substituir o banner atual "trial expirou" por um banner promocional atrativo
- Copy tipo: "Aproveite! Assine agora com **50% de desconto no primeiro mês**. Oferta exclusiva para novos assinantes."
- Botão abre o UpgradeDialog com preços promocionais

**6. `UpgradeDialog` e `PricingPage`**
- Detectar se org tem `trialExpired` e `used_first_month_promo === false`
- Quando sim: calcular metade do preço e passar como `promoPrice` ao PlanCard
- Exibir preço original riscado em vermelho + preço promo

### Segurança
- A validação do preço é feita no backend (edge function), não no frontend
- O flag `used_first_month_promo` impede uso duplicado
- O webhook garante que o preço volta ao normal após 1º pagamento

### Arquivos alterados
- **Migração SQL** — adicionar `used_first_month_promo` na tabela `organizations`
- `supabase/functions/create-mp-subscription/index.ts` — lógica de preço promocional
- `supabase/functions/mp-webhook/index.ts` — atualizar preço após 1º pagamento
- `src/components/pricing/PlanCard.tsx` — visual de preço riscado + promo
- `src/pages/DashboardPage.tsx` — banner promocional pós-trial
- `src/components/dashboard/UpgradeDialog.tsx` — preços promo quando elegível
- `src/pages/PricingPage.tsx` — preços promo quando elegível
- `src/hooks/usePlanLimits.ts` — expor flag de elegibilidade à promo

