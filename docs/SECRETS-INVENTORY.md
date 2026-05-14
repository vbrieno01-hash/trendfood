# Inventário de Secrets — TrendFood

> **Este arquivo é só TEMPLATE.** Não cole valores reais aqui — o repo está no
> GitHub, mesmo privado. Os valores devem viver em **1Password / Bitwarden /
> cofre da sua escolha**. Aqui só ficam os nomes, descrição e onde obter.

---

## 🚨 AÇÃO IMEDIATA — VAPID keys

**Antes de qualquer outra coisa, faça isso hoje:**

1. Abra **Cloud → Edge Functions → Secrets** no Lovable.
2. Copie os valores de `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`.
3. Cole no seu cofre (1Password/Bitwarden), entrada **"TrendFood — VAPID Push"**.
4. Marque a entrada como **NÃO ROTACIONAR**.

**Por quê é crítico:** essas chaves assinam todas as inscrições de push
notification (`push_subscriptions.endpoint` no banco). Se você perder e for
forçado a regenerar, **todos os clientes e lojistas precisam reassinar push do
zero**. Não é recuperável de outro jeito.

Status: ☐ feito  ☐ pendente

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
| `VAPID_PUBLIC_KEY` | Cloud → Edge Functions → Secrets | `send-push-notification`, `send-customer-push` | ☐ ⚠️ |
| `VAPID_PRIVATE_KEY` | Idem | Idem | ☐ ⚠️ |

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

- [ ] **VAPID keys salvas no cofre** (prioridade absoluta)
- [ ] Mercado Pago (3 secrets)
- [ ] iFood (2 secrets) — se usar integração
- [ ] UAZAPI (2 secrets)
- [ ] Telegram (1 secret)
- [ ] Cakto / Stripe — se usar
- [ ] Acesso ao painel do Mercado Pago anotado (login + 2FA backup codes)
- [ ] Acesso ao @BotFather anotado
- [ ] Acesso ao Google Cloud Console (para OAuth pós-migração)