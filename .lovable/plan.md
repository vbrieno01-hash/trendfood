## Visão geral

Zera recorrência infinita. Cada cliente trazido pelo afiliado é uma **meta** com começo e fim:
- **À Vista**: afiliado recebe 100% da comissão (% upfront da tabela v8) 7 dias após o pagamento do cliente. Cliente "morre" — não gera mais nada.
- **3x**: afiliado recebe 1/3 da comissão (% 3x da tabela v8) por mês durante 3 meses corridos. No 3º mês o cliente "morre".

Quem escolhe é o **próprio afiliado, pelo Telegram**, quando o bot avisa que uma loja nova assinou (botões inline). Tem 48h pra escolher, senão vai automático pra **À Vista**.

Pagamento batch **todo dia 5 do mês** (manual via CSV/lista no Telegram do admin — você dispara o PIX em lote no app do banco).

## Tabela v8 (referência)

| Plano cliente | À Vista | 3x (cada parcela) |
|---|---|---|
| Mensal R$ 79 | 30% | 25% |
| Trimestral R$ 199 | 20% | 15% |
| Anual R$ 599 | 15% | 10% |
| Lifetime R$ 999 | 25% | 12% |
| Add-on mensal | 15% | 12% |
| Add-on único | 10% | 12% |

## Mudanças no banco

**`affiliates`** — remove `commission_mode` (não é mais por afiliado, é por cliente). Mantém `pix_key`, `telegram_chat_id`.

**`affiliate_commission_tiers`** (nova) — 6 linhas com `plan`, `cycle`, `upfront_pct`, `installment_pct`. Editável no admin.

**`affiliate_client_goals`** (nova, substitui o modelo recorrente):
- `id`, `affiliate_id`, `client_org_id`, `source_payment_id`, `plan`, `cycle`, `client_amount`
- `mode` ENUM (`pending_choice`, `upfront`, `installments_3x`)
- `total_commission` (valor fechado da meta)
- `installments_total` (1 ou 3), `installments_paid` (0..3)
- `next_release_at`
- `status` ENUM (`awaiting_choice`, `active`, `completed`, `refunded`)
- `choice_deadline_at` (default = now + 48h)
- `completed_at`

**`affiliate_commissions`** (existente) — vira "parcela da meta": adiciona `goal_id`, `installment_index` (1..3), `release_at`, `paid_in_batch_id`.

**`affiliate_payout_batches`** (nova) — 1 linha por dia 5: `id`, `period_month`, `paid_at`, `total_amount`, `csv_url`, `notes`.

## Edge functions

**`mp-webhook`** (rewrite parcial): quando cliente paga, cria `affiliate_client_goals` com `status=awaiting_choice`, busca tier, calcula upfront e 3x, dispara `notify-affiliate-telegram` com botões inline `[À Vista 7d]` `[3x mensal]`.

**`telegram-webhook-affiliate`** (nova): recebe `callback_query` do botão, atualiza `mode`, cria parcelas em `affiliate_commissions`:
- À Vista: 1 linha, `release_at = payment_date + 7 dias`
- 3x: 3 linhas, `release_at = payment_date + 30/60/90 dias`
- Marca `status=active`, confirma no chat.

**`affiliate-auto-choose`** (cron diário): goals com `choice_deadline_at < now` e `awaiting_choice` → força `upfront`, avisa afiliado.

**`affiliate-monthly-payout`** (cron dia 5 às 09:00 BRT):
- Pega `affiliate_commissions` com `release_at <= now` e `paid_in_batch_id IS NULL`
- Agrupa por afiliado, cria `affiliate_payout_batches`
- Marca parcelas como pagas, incrementa `installments_paid`
- Se `installments_paid == installments_total` → `status=completed`, manda "🎯 Meta concluída"
- Gera CSV (chave PIX + valor) e envia pro Telegram do admin pra pagar em lote

**`mp-webhook` (refund)**: chargeback → `goal.status=refunded`, parcelas não-pagas viram `cancelled`.

## Telegram do afiliado

1. **Cliente novo** (com botões):
   ```
   🎉 Nova loja: Pizzaria do Zé
   Plano: Mensal R$ 79
   
   💰 À Vista: R$ 23,70 em 7 dias
   📅 3x: R$ 19,75/mês (total R$ 59,25)
   
   ⏰ Você tem 48h. Sem escolha = À Vista.
   ```

2. **Confirmação**: "✅ Escolha registrada: 3x. Próxima parcela libera em 30/06 (R$ 19,75)."

3. **Dia 5 — pagamento**:
   ```
   💸 Pagamento de Maio — R$ 187,50
   • Pizzaria do Zé (3x, 2/3): R$ 19,75
   • Bar X (À Vista, final): R$ 23,70 ✅
   • Lanches Y (3x, 1/3): R$ 19,75
   PIX enviado pra xxx@xxx
   ```

4. **Meta concluída**: "🎯 Cliente XYZ encerrou (3/3 pago). Total: R$ 59,25. Bora trazer mais!"

5. **Comando `/metas`**: lista goals ativas com próxima parcela e quanto falta.

## Admin (`AffiliatesTab` + `ReferralsTab`)

- **Tiers editáveis** (grid 6 linhas, upfront % e 3x %)
- **Card por afiliado**: total recebido, metas ativas, metas concluídas, próximo pagamento dia 5
- **Tabela de goals** filtrável por status
- **Aba "Pagamento dia 5"**: preview do batch atual (quem recebe, quanto), botão "Marcar como pago" + upload de comprovante, download CSV
- **Histórico de batches**

## Fora do escopo (fica pra depois)

- PIX automático via MP em lote
- Portal web do afiliado (só Telegram + admin)
- Comissão escalonada por volume
