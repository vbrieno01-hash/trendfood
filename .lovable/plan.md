

## Plano — Pacote essencial de alertas Telegram (alto valor)

Vou adicionar **os 5 alertas que mais valem a pena** pro seu dia a dia, focados em **dinheiro + retenção + crescimento**. Sem encher o saco com notificação inútil.

### O que vai chegar no seu Telegram (além do que já tem)

**💰 1. Pagamento de assinatura confirmado**
> 💰 **Pagamento confirmado!**
> 🏪 Pizzaria X • Plano Pro Mensal
> 💵 R$ 49,90 via PIX
> 📈 MRR estimado: R$ 1.247,80

Disparado quando o webhook do Mercado Pago confirma pagamento aprovado.

**❌ 2. Falha de cobrança (cartão recusado)**
> ❌ **Cobrança recusada**
> 🏪 Pizzaria X • Pro Mensal
> 💳 Motivo: cartão expirado
> ⚠️ Loja perde acesso em 3 dias se não regularizar

Disparado quando MP retorna `payment.rejected` ou `subscription.payment_failed`.

**⏰ 3. Trial acabando (3 dias / 1 dia / hoje)**
> ⏰ **Trial expira em 1 dia**
> 🏪 Pizzaria X
> 📊 Já fez **47 pedidos** no trial
> 📱 WhatsApp: 11 99999-9999
> 👉 Bom momento pra ligar e converter

Cron diário às 09h verifica `trial_ends_at` em D-3, D-1 e D-0.

**🔥 4. Loja "quente" (alta atividade no Free)**
> 🔥 **Lead quente detectado!**
> 🏪 Pizzaria X (plano Grátis)
> 📊 Bateu **50 pedidos hoje** (limite Free é apertado)
> 💡 Pronto pra abordar e oferecer Pro

Cron a cada 2h durante o dia checa lojas Free com >30 pedidos/dia.

**😴 5. Loja "fria" (risco de churn em planos pagos)**
> 😴 **Loja inativa há 7 dias**
> 🏪 Pizzaria X (Pro Mensal)
> 📉 Último pedido: 15/04
> 💸 Risco de cancelamento • R$ 49,90 MRR em jogo

Cron diário às 09h checa lojas Pro/Enterprise sem pedidos há 7+ dias.

### Onde configurar

Na aba **Painel Admin → Telegram Admin** (que já existe), vou adicionar **5 novos toggles**:
- 💰 Pagamentos confirmados
- ❌ Falhas de cobrança
- ⏰ Trials expirando
- 🔥 Lojas quentes (leads)
- 😴 Lojas frias (churn)

Todos vêm **ligados por padrão**. Você desliga o que não quiser.

### Como vai funcionar tecnicamente

```text
┌─ Pagamento aprovado ─→ mp-webhook ─→ admin-telegram-notify (event: payment_confirmed)
├─ Pagamento recusado ─→ mp-webhook ─→ admin-telegram-notify (event: payment_failed)
├─ Cron 09h diário   ─→ admin-telegram-watchdog ─→ varre trials + churn
└─ Cron 11h/15h/19h  ─→ admin-telegram-watchdog ─→ detecta lojas quentes
```

### Componentes técnicos

**1. Edge function nova: `admin-telegram-watchdog`**
- Roda via pg_cron em horários estratégicos
- Faz 3 varreduras:
  - Trials em D-3 / D-1 / D-0 (lê `trial_ends_at` + conta pedidos do trial)
  - Lojas Pro/Enterprise sem pedidos há 7+ dias
  - Lojas Free com >30 pedidos/dia (conta de hoje)
- Para cada hit, chama `admin-telegram-notify` com o evento certo
- Anti-spam: tabela `admin_telegram_dedupe` (chave `event_type|org_id|date`) evita disparar 2x no mesmo dia

**2. Editar `admin-telegram-notify` (já existe)**
- Adicionar 5 novos `event_type` no `buildMessage`:
  - `payment_confirmed`
  - `payment_failed`
  - `trial_expiring` (já existe `subscription_expiring`, vou reaproveitar/renomear)
  - `hot_lead`
  - `cold_store`
- Adicionar os 5 novos toggles no default do `admin_telegram_events`

**3. Editar `mp-webhook` (já existe)**
- Quando MP retornar pagamento aprovado de assinatura → chama `admin-telegram-notify` com `payment_confirmed`
- Quando MP retornar pagamento recusado → chama com `payment_failed`
- Calcula MRR estimado somando todas as assinaturas ativas

**4. Migração SQL**
- Nova tabela `admin_telegram_dedupe (event_key text PK, sent_at timestamptz)` — TTL 7 dias
- Atualizar default de `platform_config.admin_telegram_events` com os 5 novos toggles
- Agendar pg_cron:
  - `admin-telegram-watchdog-morning` — todo dia 09h BRT (trials + churn)
  - `admin-telegram-watchdog-business` — 11h/15h/19h BRT (hot leads)

**5. Editar `AdminTelegramTab.tsx`**
- Adicionar os 5 novos toggles na seção de eventos com labels/ícones em português

### Anti-spam (importante)

- **Trial expirando** dispara só 1x por dia por loja por janela (D-3, D-1, D-0)
- **Lead quente** dispara só 1x por loja por dia
- **Loja fria** dispara só 1x por loja por semana
- **Pagamentos** sempre disparam (são únicos por natureza)

Tudo controlado pela tabela `admin_telegram_dedupe`.

### O que NÃO vou mexer

- Sistema de Telegram dos lojistas — intocado
- Push notification de pedidos — intocado
- Lógica de pagamento/cobrança — só adiciono notificação no final
- Trials/expiração de plano — só leio, não mudo regra

### Arquivos envolvidos

**Novos:**
- `supabase/functions/admin-telegram-watchdog/index.ts`
- 1 migração SQL (tabela dedupe + cron jobs + default toggles)

**Editados:**
- `supabase/functions/admin-telegram-notify/index.ts` (5 novos eventos)
- `supabase/functions/mp-webhook/index.ts` (chamar notify em aprovado/recusado)
- `src/components/admin/AdminTelegramTab.tsx` (5 novos toggles)
- `supabase/config.toml` (registrar `admin-telegram-watchdog` com `verify_jwt = false`)

### Resultado esperado

Você vai parar de descobrir cancelamento depois que aconteceu. Vai saber **antes** quem vai pagar, quem está pra cancelar e quem está pronto pra upgrade — tudo no Telegram, sem precisar abrir o painel.

