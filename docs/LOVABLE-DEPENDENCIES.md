# Auditoria de dependências do Lovable

Mapa vivo de tudo que prende o projeto à infra do Lovable. Gerado via `grep` em
todo o repositório (excluindo `node_modules`, `dist`, `types.ts`, lockfiles).
Atualize sempre que adicionar nova URL/secret hardcoded.

Última auditoria: 2026-05-14.

---

## 1. URL do projeto Supabase (`xrzudhylpphnzousilye.supabase.co`)

Hardcoded em 3 arquivos de produção (fora de `.env` e `client.ts`, que já são
gerados a partir de variáveis):

| Arquivo | Linha | Uso | Ação na migração |
|---|---|---|---|
| `src/components/admin/AIBotAdminTab.tsx` | 27 | `WEBHOOK_URL` whatsapp-webhook | Trocar por `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook` |
| `src/components/admin/ActivationLogsTab.tsx` | 30 | `WEBHOOK_BASE` universal-activation-webhook | Idem |
| `src/lib/errorLogger.ts` | 41 | Lê chave `sb-xrzudhylpphnzousilye-auth-token` do localStorage | Derivar do `VITE_SUPABASE_PROJECT_ID` |

**Risco hoje:** baixo. Continua funcionando enquanto o projeto Supabase
gerenciado pelo Lovable existir.

---

## 2. Domínio público `trendfood.lovable.app`

17 ocorrências entre frontend e edge functions.

**Frontend (`src/`):**

- `components/admin/AffiliatesTab.tsx:70` — `PROD_URL`
- `components/dashboard/CourierDashboardTab.tsx:204` — link motoboy
- `components/dashboard/ReferralSection.tsx:32` — `BASE_URL`
- `components/dashboard/StoreProfileTab.tsx:166` — `PUBLIC_BASE_URL`
- `components/dashboard/TablesTab.tsx:38` — `PRODUCTION_URL`
- `components/shared/ThermalReceipt.tsx:119` — QR Code recibo
- `lib/formatReceiptText.ts:217` — rodapé recibo
- `lib/printOrder.ts:174,212` — rodapé HTML + QR
- `pages/AuthPage.tsx:185` — `redirectTo` reset de senha
- `pages/CourierPage.tsx:570` — link WhatsApp do motoboy
- `pages/DashboardPage.tsx:416,888` — mensagem Bluetooth + link unidade
- `pages/DocsTerminalPage.tsx:532` — instrução de popup
- `pages/InstallPage.tsx:151` — texto de instalação

**Edge functions (`supabase/functions/`):**

- `admin-telegram-notify/index.ts:4,5` — `STOREFRONT_BASE`, `ADMIN_PANEL_URL`
- `ai-bot-respond/index.ts:104,147` — links no contexto da IA
- `create-mp-subscription/index.ts:132` — `back_url` Mercado Pago
- `support-chat/index.ts:168,175` — texto do system prompt

**Bonus (custom domains já apontando):** `trendfood.site` e `www.trendfood.site`
já estão configurados como custom domains no Lovable. Quando migrar, o DNS desses
dois domínios é repontado para a nova hospedagem (Vercel/Netlify) e o
`trendfood.lovable.app` é abandonado.

**Ação na migração:** centralizar em uma única constante
`VITE_PUBLIC_BASE_URL=https://trendfood.site` e refatorar todos os 17 pontos
(refactor mecânico, ~30 minutos). Edge functions usam `Deno.env.get("PUBLIC_BASE_URL")`.

---

## 3. Pacote npm `@lovable.dev/cloud-auth-js`

Usado **apenas em 1 arquivo auto-gerado**:

- `src/integrations/lovable/index.ts` — provider Google OAuth via Lovable Cloud
- `package.json` linha 17 — dependência

**Substituto na migração:** usar OAuth nativo do Supabase com Google Cloud
Console próprio:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/dashboard` },
});
```

Pré-requisito: criar OAuth Client ID no Google Cloud Console e cadastrar no
Supabase próprio em Auth → Providers → Google.

---

## 4. Lovable AI Gateway (`LOVABLE_API_KEY` + `ai.gateway.lovable.dev`)

10 edge functions dependem do gateway:

- `support-chat`
- `sales-chat`
- `ai-bot-respond`
- `whatsapp-webhook`
- `admin-telegram-digest`
- `admin-telegram-notify`
- `notify-affiliate-telegram`
- `notify-merchant-telegram`
- `telegram-automations`
- `test-telegram`

**Modelo usado:** `google/gemini-3-flash-preview` (via gateway).

**Substituto na migração:** chamar provider direto.

- Opção A — OpenAI: `https://api.openai.com/v1/chat/completions` com
  `OPENAI_API_KEY` própria. Modelo equivalente: `gpt-5-mini` ou `gpt-4o-mini`.
- Opção B — Google AI Studio: `https://generativelanguage.googleapis.com` com
  `GEMINI_API_KEY` própria. Modelo: `gemini-2.5-flash`.

Refactor: trocar a URL e o header `Authorization`. ~10 minutos por function.

---

## 5. O que NÃO migra automático

| Item | Por quê | Como resolver |
|---|---|---|
| Hashes bcrypt em `auth.users` | São proprietários do Supabase, mas portáveis via `pg_dump` | Sai junto no dump completo do banco |
| Sessões JWT ativas | Assinadas com a chave do projeto Lovable | Usuários relogam 1x após migração (aceitável) |
| Jobs `pg_cron` | Vivem no banco gerenciado | Recriar via migration SQL no Supabase próprio |
| Webhooks externos | Apontam para `*.supabase.co` do Lovable | Reapontar manualmente em Mercado Pago, iFood, Cakto, UAZAPI, Telegram |
| VAPID keys (push) | Vivem como secrets das edge functions | Baixar **agora** e guardar (perda = todos os clientes precisam reassinar push) |
| Custom domain `trendfood.lovable.app` | Subdomínio do Lovable | Abandonado; `trendfood.site` continua |

---

## 6. Fora do radar (ok manter)

- `lovable-uploads` em URLs de assets: nenhum encontrado.
- Imports `@lovable/*` (exceto `cloud-auth-js`): nenhum.
- Hardcodes em `supabase/migrations/`: nenhum (auditado).
- `.env` e `src/integrations/supabase/client.ts`: gerados pelo Lovable, ok.