## Objetivo

Garantir que o sistema anti-fraude que construímos (trigger de validação, carência de 7d, reversão por refund, limite mensal) **não falhe silenciosamente em produção**. Hoje funciona, mas se algo quebrar você só descobre quando alguém reclamar.

## 3 frentes

### 1. Testes automatizados do anti-fraude (SQL puro)

Criar `supabase/functions/_tests/referral-fraud.test.ts` rodando contra o banco com service role. Cobre os 6 cenários críticos:

1. **Auto-indicação direta** (`referrer = referred`) → trigger lança erro
2. **Mesmo `user_id`** nas duas orgs → trigger lança erro
3. **Mesmo CNPJ normalizado** → trigger lança erro
4. **Mesmo WhatsApp normalizado** → trigger lança erro
5. **Limite mensal excedido** (somar >180 dias em 30d) → insere com `flagged_reason = 'monthly_limit_exceeded'` e `released_at = NULL`
6. **Refund flow**: insere bônus com `source_payment_id`, força `applied_at` via update, chama `revert_referral_bonus_by_payment(payment_id)` → confirma `reverted_at` preenchido e `trial_ends_at` reduzido pelos `bonus_days`

Cada teste cria orgs efêmeras com prefixo `test-fraud-` e limpa no `finally`.

### 2. Watchdog do `pg_cron` de liberação

Hoje `release_pending_referral_bonuses()` roda de hora em hora. Se o cron falhar/atrasar, bônus ficam pendentes para sempre.

- Criar tabela `cron_health` (job_name, last_success_at) ou reusar `activation_logs`.
- Alterar a função pra registrar `last_success_at = now()` ao final.
- Criar nova edge function `referral-cron-watchdog` (verify_jwt=false) que:
  - Verifica se `last_success_at < now() - 2h` ou se existe bônus com `released_at < now() - 2h AND applied_at IS NULL AND reverted_at IS NULL`.
  - Se sim, dispara `notify_admin_telegram('cron_lagging', {...})`.
- Agendar essa watchdog via `pg_cron` a cada 30 min.

### 3. Notificação Telegram quando bônus é bloqueado/flagged

Adicionar trigger `AFTER INSERT` em `referral_bonuses` que dispara `notify_admin_telegram('referral_flagged', {...})` quando `NEW.flagged_reason IS NOT NULL`. Atualizar `admin-telegram-notify` pra renderizar o caso novo (motivo + nomes + IDs + link admin).

Também cobrir os erros lançados pelo trigger (auto-indicação, mesmo CNPJ etc.): hoje eles abortam o INSERT e ninguém vê. Solução: encapsular o INSERT no `mp-webhook` e `universal-activation-webhook` num try/catch — quando der `P0001` com mensagem de auto-indicação/CNPJ/WA, registrar num novo `referral_block_logs` (org_referrer, org_referred, reason, payment_id) e disparar Telegram. Assim você vê tentativas de fraude que foram bloqueadas, não só as marcadas pra revisão.

## Mudanças concretas

**Migração SQL**:
- Tabela `referral_block_logs` (referrer_org_id, referred_org_id, reason, source_payment_id, created_at) com RLS só admin.
- Tabela `cron_health` (job_name PK, last_success_at) com RLS só admin.
- Trigger `tr_notify_referral_flagged AFTER INSERT` em `referral_bonuses`.
- Atualizar `release_pending_referral_bonuses()` pra fazer `UPSERT` em `cron_health` no final.
- `pg_cron`: agendar `referral-cron-watchdog` a cada 30 min.

**Edge functions**:
- `mp-webhook` e `universal-activation-webhook`: try/catch no insert de `referral_bonuses`, gravar `referral_block_logs` em caso de erro do trigger.
- Nova: `referral-cron-watchdog` (verifica health + dispara Telegram).
- `admin-telegram-notify`: novos casos `referral_flagged`, `referral_blocked`, `cron_lagging`.

**Testes**:
- `supabase/functions/_tests/referral-fraud.test.ts` com os 6 cenários acima.

**Frontend**:
- Em `ReferralsTab` do admin (já existe), adicionar seção "Tentativas bloqueadas" lendo `referral_block_logs` (últimos 30 dias).

## Detalhes técnicos

- Os testes usam `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env`.
- O watchdog usa o mesmo padrão de `admin-telegram-watchdog` que já existe.
- Nada disso muda comportamento normal — só adiciona observabilidade. Risco de regressão é baixo.

## Fora do escopo

- Reescrever lógica do trigger (já está correta).
- Mudar a janela de carência (7d permanece).
- Mexer no fluxo de bônus do usuário final na UI (já mostra carência/revisão).
