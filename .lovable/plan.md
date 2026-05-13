## O que já protege hoje

- `unique_referral_pair` (referrer, referred) → cada loja indicada só credita bônus **uma vez**, mesmo que o amigo cancele e reassine.
- Bônus **só dispara quando o MP confirma pagamento** real (cartão/PIX). Não basta cadastrar.
- Cartão precisa ser de CNPJ na conta MP PJ — barra teste com cartão de presente.

## Onde ainda dá pra burlar

1. **Auto-indicação**: criar uma 2ª loja com o próprio link (`referred_by_id = própria org`).
2. **Mesmo dono, vários CNPJs/cartões**: a pessoa abre 5 lojas (e‑mails diferentes, CNPJs diferentes), usa o link da loja-mãe e paga um mês em cada uma → ganha 5 meses grátis na loja-mãe.
3. **Mesmo cartão** em contas diferentes para se auto-creditar.
4. **Refund após o crédito**: amigo paga, ganha o bônus, depois pede chargeback/cancela em 7 dias → o bônus já foi pra sempre.
5. **Escala industrial**: alguém montar 50 contas e zerar a mensalidade pra sempre.

## Camadas de defesa propostas (todas em SQL — fonte da verdade)

### 1. Trigger `validate_referral_bonus` em `referral_bonuses` BEFORE INSERT
Bloqueia a criação do bônus quando detecta sinal de auto-indicação:

- `referrer_org_id = referred_org_id` → erro
- Mesmo `user_id` (dono) nas duas orgs → erro
- Mesmo `cnpj` normalizado nas duas orgs → erro
- Mesmo `whatsapp` normalizado (só dígitos) → erro
- Mesmo `mp_payer_email` ou `mp_card_first6_last4` (a definir, se já guardamos no MP webhook) → erro

Como o INSERT vem dos webhooks (service role), o trigger é a única defesa que não dá pra contornar via SDK.

### 2. Limite mensal de bônus por referrer
Trigger soma `bonus_days` dos últimos 30 dias do mesmo `referrer_org_id`. Se passar de **180 dias/mês** (≈ 6 indicações mensais), bloqueia o crédito e marca pra revisão. Indicações honestas raramente passam disso; quem passar fica visível pro admin.

### 3. Reversão automática em refund/chargeback
No `mp-webhook`, quando recebermos `payment.refunded` ou `chargeback`:
- localizar o `referral_bonus` derivado daquele pagamento;
- subtrair `bonus_days` do `trial_ends_at` do referrer;
- marcar o bônus como `reverted = true` (nova coluna).

Isso fecha o golpe "paga, ganha, estorna".

### 4. Carência (hold) de 7 dias
Em vez de creditar `trial_ends_at` na hora, gravar o bônus com `released_at = now() + 7 dias` e um `pg_cron` diário libera os bônus que passaram do prazo **sem refund**. Mesma lógica que já existe em `affiliate_commissions`.

### 5. Auditoria + admin
- Coluna `referral_bonuses.flagged_reason TEXT` para registrar o motivo quando algo é bloqueado/marcado.
- Aba do admin lista bônus suspeitos (`flagged_reason IS NOT NULL` ou acima do limite mensal) com botão "anular".
- Notificação Telegram pro admin quando um bloqueio acontece.

## Mudanças concretas

**Migration**:
- `ALTER TABLE referral_bonuses ADD COLUMN released_at TIMESTAMPTZ, ADD COLUMN reverted BOOLEAN DEFAULT false, ADD COLUMN flagged_reason TEXT, ADD COLUMN source_payment_id TEXT;`
- Função `validate_referral_bonus()` + trigger BEFORE INSERT (regras 1 e 2).
- Função `release_pending_referral_bonuses()` + agendamento `pg_cron` diário (regra 4).

**Edge functions**:
- `mp-webhook`: gravar `source_payment_id` ao criar o bônus; no `payment.refunded` rodar reversão (regra 3); ao criar, em vez de somar em `trial_ends_at` direto, deixar `released_at = now() + 7d` e somar só na liberação.
- `universal-activation-webhook` e `ManageSubscriptionDialog`: mesmo padrão — usar `released_at`.

**Frontend**:
- `ReferralSection`: mostrar bônus em "carência" como "+30 dias (libera em X dias)".
- Admin: lista de bônus flagged com ação "anular".

## Decisões em aberto pra você confirmar

1. **Limite mensal**: 180 dias/mês (≈6 indicações) tá bom ou prefere outro número?
2. **Carência**: 7 dias OK, ou prefere alinhar com o ciclo do cartão (ex: 14 dias)?
3. **Bloqueio por mesmo WhatsApp**: WhatsApp obrigatório no onboarding, então é checagem forte. Mantenho como bloqueio duro?
4. **Bônus já creditados**: aplicar a carência só pra novos, ou recalcular os existentes? (sugestão: só pra novos — não mexe com quem já recebeu).