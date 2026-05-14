# Inventário de Secrets — TrendFood

> **Este arquivo é só TEMPLATE.** Não cole valores reais aqui — o repo está no
> GitHub, mesmo privado. Os valores devem viver em **1Password / Bitwarden /
> cofre da sua escolha**. Aqui só ficam os nomes, descrição e onde obter.

---

## 🚨 VAPID keys — realidade operacional

**Descoberta importante:** o Lovable (como o Supabase) **oculta o valor das
secrets depois de salvas**. No painel **Cloud → Edge Functions → Secrets**,
`VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` aparecem com o nome e apenas o ícone
de lixeira — **não há botão "Manage" / "Reveal"**. A UI não permite copiar
os valores depois que foram criados.

### VAPID_PUBLIC_KEY — não é secreta

A pública **não precisa ser secreta**: vai no bundle JavaScript servido ao
navegador para o cliente conseguir se inscrever no push. Já está hardcoded em:

- `src/hooks/usePushSubscription.ts`
- `src/hooks/useCustomerPush.ts`

Valor atual:

```
BBATtReMYYfX0TzAWOBYZkVAZlvUZlQJGI-YRtlqpPRo3Y0enwYdArCVl4R1TzyoeJuPD8gbSlKippNGaim-6QM
```

**Ação:** copiar dali pro cofre (entrada **"TrendFood — VAPID Push"**, campo
`public`). Marcar a entrada como **NÃO ROTACIONAR**.

### VAPID_PRIVATE_KEY — existe no Lovable, valor não exportável pela UI

A privada está salva como secret no Lovable e **funciona** dentro das edge
functions (`Deno.env.get("VAPID_PRIVATE_KEY")` em `send-push-notification` e
`send-customer-push`), mas **o valor não pode mais ser visualizado**.

**Não deletar. Não rotacionar.** Isso invalidaria todas as inscrições push
existentes (`push_subscriptions` e `customer_push_subscriptions`) e forçaria
todos os clientes e lojistas a reassinar push do zero.

#### Estratégia de backup da VAPID_PRIVATE_KEY

Três caminhos possíveis, em ordem do mais seguro pro mais arriscado:

- **Opção A — Aceitar perda controlada (oficial, em vigor).**
  Não fazer nada agora. No dia de uma migração real (Onda 2 do
  `docs/MIGRATION-PLAN.md`), gerar **um par VAPID novo** no backend de destino,
  atualizar `VAPID_PUBLIC_KEY` no frontend e aceitar que os usuários reassinem
  push uma vez. Custo: uma rodada de reassinatura. Risco hoje: zero.

- **Opção B — Edge function temporária de extração (só com aprovação explícita).**
  Function efêmera, protegida por token de uso único, que devolve
  `Deno.env.get("VAPID_PRIVATE_KEY")`. Copiar o valor pro cofre e **deletar a
  function imediatamente**. Janela curta, auditar logs. Envolve alteração de
  código de produção — **não fazer sem aprovação explícita do dono em janela
  controlada**.

- **Opção C — Rotacionar agora.** **Proibido.** Quebra push de todos os
  clientes ativos antes da migração.

> Ver `docs/MIGRATION-PLAN.md` Onda 2: a geração do novo par VAPID e a
> comunicação aos clientes ("reative as notificações") devem entrar no
> checklist daquela onda.

---

## 🔴 CRÍTICAS — receita direta

Sem essas, dinheiro para de entrar.

| Secret | Onde obter | Onde é usada | Cofre |
|---|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | mercadopago.com.br → Suas integrações → Credenciais de produção | Edge functions: `create-mp-subscription`, `mp-webhook`, `process-pix-payment`, etc. | ☐ |
| `MERCADO_PAGO_PUBLIC_KEY` | Mesmo lugar | `get-mp-public-key` (devolvida ao frontend) | ☐ |
| `MERCADO_PAGO_WEBHOOK_SECRET` | MP → Webhooks → Configurar | Validação de assinatura de webhook | ☐ |
| `CAKTO_API_KEY` (se usado) | Painel Cakto | Webhook de assinatura | ☐ |
| `STRIPE_SECRET_KEY` (se usado) | dashboard.stripe.com → Developers → API keys | Backup gateway | ☐ |

---

## 🟠 IMPORTANTES — operação

Sem essas, partes do app param (entrega de pedido, notificação).

| Secret | Onde obter | Onde é usada | Cofre |
|---|---|---|---|
| `IFOOD_CLIENT_ID` | portal.ifood.com.br → Aplicativos | `ifood-poll-orders`, `ifood-webhook` | ☐ |
| `IFOOD_CLIENT_SECRET` | Mesmo lugar | Idem | ☐ |
| `UAZAPI_TOKEN` | Painel UAZAPI / Evolution | `whatsapp-webhook`, `notify-merchant-whatsapp` | ☐ |
| `UAZAPI_BASE_URL` | URL da sua instância Evolution | Idem | ☐ |
| `TELEGRAM_API_KEY` | @BotFather no Telegram | Todas as funções `*-telegram-*` | ☐ |
| `VAPID_PUBLIC_KEY` | Frontend (`src/hooks/usePushSubscription.ts`) — não é secreta | `send-push-notification`, `send-customer-push` | ☐ |
| `VAPID_PRIVATE_KEY` | **Não exportável pela UI.** Backup só via Opção B (requer aprovação) | Idem | ⚠️ adiado |

---

## 🟡 RECRIÁVEIS — geradas pela infra

Se perder, basta gerar novas no Supabase próprio (na migração).

| Secret | Origem |
|---|---|
| `SUPABASE_URL` | Auto-gerada pelo projeto Supabase |
| `SUPABASE_ANON_KEY` | Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API (manter secreta) |
| `VITE_SUPABASE_*` | Replicam as 3 acima no `.env` do frontend |

---

## 🟢 LOVABLE-MANAGED — substituídas na migração

| Secret | Substituto após migração |
|---|---|
| `LOVABLE_API_KEY` | `OPENAI_API_KEY` (api.openai.com) **ou** `GEMINI_API_KEY` (Google AI Studio) |

Detalhes em `docs/LOVABLE-DEPENDENCIES.md` seção 4.

---

## 📋 Política de rotação

| Secret | Frequência | Quem rotaciona |
|---|---|---|
| `MERCADO_PAGO_*` | A cada 12 meses ou em incidente | Você |
| `STRIPE_SECRET_KEY` | A cada 12 meses ou em incidente | Você |
| `TELEGRAM_API_KEY` | Em incidente | Você (via @BotFather → revoke) |
| `UAZAPI_TOKEN` | Em incidente | Você |
| `VAPID_*` | **Nunca** (perde push de todos os clientes) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | A cada 12 meses | Cloud → Settings → API |

Após rotacionar, atualize o secret em **Cloud → Edge Functions → Secrets** e
anote a data no cofre.

---

## ✅ Checklist de preenchimento

- [ ] **VAPID_PUBLIC_KEY** copiada do frontend e salva no cofre
- [x] **VAPID_PRIVATE_KEY** documentada como "existe no Lovable, valor não exportável pela UI" — backup adiado para o dia da migração (Opção A)
- [ ] Mercado Pago (3 secrets)
- [ ] iFood (2 secrets) — se usar integração
- [ ] UAZAPI (2 secrets)
- [ ] Telegram (1 secret)
- [ ] Cakto / Stripe — se usar
- [ ] Acesso ao painel do Mercado Pago anotado (login + 2FA backup codes)
- [ ] Acesso ao @BotFather anotado
- [ ] Acesso ao Google Cloud Console (para OAuth pós-migração)