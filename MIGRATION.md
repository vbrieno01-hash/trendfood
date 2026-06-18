# Plano de migração — Lovable Cloud → Supabase próprio + Vercel

Este documento é o passo-a-passo do **dia do corte** para sair do Lovable Cloud
(`xrzudhylpphnzousilye.supabase.co` + `trendfood.lovable.app`) para a conta
Supabase própria (`vbrieno01-hash's Org`) hospedando o frontend na Vercel.

Status atual da preparação: **Onda 0 concluída** — frontend já está portável
(URLs vêm de `VITE_PUBLIC_BASE_URL` / `window.location.origin`, e edge functions
são chamadas via `VITE_SUPABASE_URL`).

---

## Pré-requisitos (fazer ANTES do corte)

1. **Plano Supabase Pro** ativo na conta nova (~$25/mês). Free não tem `pg_cron`
   nem backup automático — o TrendFood depende dos dois.
2. **Backup completo do projeto Lovable**:
   - `pg_dump` do banco inteiro (inclui `auth.users` com hashes bcrypt).
   - Download dos buckets de Storage (`logos`, `menu-images`, `guides`, etc.).
   - Cópia dos secrets ativos (use o painel de Secrets do Lovable Cloud — alguns
     são gerenciados e precisam ser anotados manualmente).
   - VAPID keys de push (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`). Sem isso,
     todas as assinaturas de push existentes ficam inválidas.
3. **Inventário de webhooks externos**:
   - Mercado Pago (webhook de pagamentos + assinaturas)
   - iFood (webhook de eventos)
   - Cakto (universal-activation-webhook)
   - UAZAPI / Evolution (WhatsApp)
   - Telegram bots (admin + afiliados)
4. **Provider de IA novo** (quando você decidir pagar): chave de OpenAI ou
   Gemini. Hoje a IA usa o Lovable AI Gateway (`LOVABLE_API_KEY`) — não funciona
   fora do Lovable.

---

## Onda 1 — Frontend na Vercel (sem corte ainda)

1. Criar projeto na Vercel apontando para o mesmo repo do GitHub.
2. Configurar variáveis de ambiente (use as MESMAS do Lovable enquanto não cortar):
   - `VITE_SUPABASE_URL` = `https://xrzudhylpphnzousilye.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (mesma de hoje)
   - `VITE_SUPABASE_PROJECT_ID` = `xrzudhylpphnzousilye`
   - `VITE_PUBLIC_BASE_URL` = `https://trendfood.site` *(novo — define a URL pública)*
3. Deploy → testar tudo em URL temporária (`*.vercel.app`):
   - Login email/senha
   - Login Google ⚠️ **vai falhar** (broker `oauth.lovable.app` só responde em
     domínios `*.lovable.app`). Ver "Onda 1.5" abaixo.
   - Cardápio público (`/unidade/<slug>`)
   - Pedido novo (storefront → KDS)
   - Impressão térmica (QR code do rodapé deve mostrar `trendfood.site`)
4. Quando tudo estiver verde, repontar DNS de `trendfood.site` para a Vercel.
5. Manter `trendfood.lovable.app` como fallback ativo por 30 dias.

### Onda 1.5 — Trocar login Google (obrigatório antes do corte ou logo após)

No `src/pages/AuthPage.tsx`, substituir:

```ts
const result = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: `${window.location.origin}/auth`,
});
```

por:

```ts
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth` },
});
if (error) toast.error("Erro ao entrar com Google. Tente novamente.");
```

E remover o import `import { lovable } from "@/integrations/lovable/index";`.

No painel do Supabase próprio: Authentication → Providers → Google → ativar com
seu Client ID / Secret do Google Cloud Console (incluir
`https://<project-ref>.supabase.co/auth/v1/callback` na lista de Authorized
redirect URIs).

---

## Onda 2 — Banco + Edge Functions na conta nova (DIA DO CORTE)

Janela sugerida: **4h da manhã de terça-feira** (menor movimento).

### Antes da janela

1. Criar projeto novo no Supabase (`vbrieno01-hash's Org`), plano Pro.
2. Rodar todas as migrations do diretório `supabase/migrations/` no projeto novo.
3. Recriar buckets de Storage com as mesmas políticas (`logos`, `menu-images`,
   `guides`, etc.).
4. Configurar todos os secrets das edge functions no projeto novo.
5. Habilitar Realtime nas tabelas que usam (`orders`, `order_items`,
   `fila_impressao`, `deliveries`, `whatsapp_outbox`, etc.).
6. Refatorar as edge functions que têm URL hardcoded:
   - `supabase/functions/admin-telegram-notify/index.ts` (`STOREFRONT_BASE`, `ADMIN_PANEL_URL`)
   - `supabase/functions/ai-bot-respond/index.ts` (2 ocorrências de
     `trendfood.lovable.app`)
   - `supabase/functions/create-mp-subscription/index.ts` (`backUrl`)
   - Trocar por `Deno.env.get("PUBLIC_BASE_URL")` com fallback.
7. Deploy de todas as edge functions no projeto novo (`supabase functions deploy`).
8. Recriar jobs `pg_cron` via SQL no projeto novo (inventariar com
   `SELECT * FROM cron.job` no projeto antigo primeiro).

### Durante a janela (corte)

1. **Pausar tudo**: parar Cakto, MP, iFood polling (desligar credenciais
   temporariamente).
2. **Snapshot final** do banco antigo (`pg_dump`).
3. **Restaurar** no projeto novo (`pg_restore`). Inclui `auth.users` — usuários
   continuam logando com a mesma senha.
4. **Subir Storage** do dump local para os buckets novos.
5. **Atualizar env vars na Vercel** apontando para o projeto novo:
   - `VITE_SUPABASE_URL` = `https://<novo-ref>.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (nova)
   - `VITE_SUPABASE_PROJECT_ID` = `<novo-ref>`
   - Redeploy.
6. **Smoke test completo**:
   - Login email/senha (usuário existente) ✔
   - Login Google ✔
   - Pedido novo → KDS → impressão → notificação push
   - Webhook MP de teste
   - Bot WhatsApp respondendo

### Sessões JWT

Sessões ativas serão invalidadas (cookie aponta para project ref antigo). Todos
os usuários precisarão **logar de novo uma vez**. Aceitável.

---

## Onda 3 — Reapontar webhooks externos

Trocar a URL de webhook em cada serviço externo de
`https://xrzudhylpphnzousilye.supabase.co/functions/v1/<fn>` para
`https://<novo-ref>.supabase.co/functions/v1/<fn>`:

- **Mercado Pago** (Notificações IPN/Webhook): `mp-webhook`
- **iFood** (painel do parceiro): `ifood-webhook`
- **Cakto**: `universal-activation-webhook`
- **UAZAPI / Evolution**: `whatsapp-webhook` + `whatsapp-outbox-dispatch`
- **Telegram** (bots de admin e afiliado): `telegram-affiliate-webhook` +
  qualquer outro setWebhook ativo

Testar 1 evento de cada antes de seguir.

---

## Pós-corte

1. Manter o projeto Lovable rodando por **30 dias** em modo somente-leitura
   (caso precise consultar algo).
2. Após 30 dias estáveis → cancelar plano Lovable.
3. Guardar `pg_dump` final + cofre de secrets por **12 meses** mínimo.

---

## Custos estimados mensais

| Serviço | Valor |
|---|---|
| Supabase Pro | $25 |
| Vercel | $0 (free tier) |
| OpenAI / Gemini (quando ativar IA) | $5–30 conforme uso |
| Domínio `trendfood.site` | já pago |
| **Total** | **~$30–55/mês** |

---

## Checklist rápido (cole no dia do corte)

- [ ] Backup Storage + `pg_dump` feitos
- [ ] VAPID keys copiados
- [ ] Lista de secrets impressa
- [ ] Projeto Supabase novo Pro ativo
- [ ] Migrations rodadas no projeto novo
- [ ] Buckets recriados
- [ ] Edge functions deployadas + refatoradas
- [ ] `pg_cron` recriado
- [ ] Realtime habilitado
- [ ] Google OAuth configurado no projeto novo
- [ ] Vercel com novas env vars + redeploy
- [ ] Login Google trocado para `supabase.auth.signInWithOAuth`
- [ ] Webhooks externos reapontados (MP, iFood, Cakto, UAZAPI, Telegram)
- [ ] Smoke test ok
- [ ] DNS apontando para Vercel
- [ ] Cancelar Lovable após 30d