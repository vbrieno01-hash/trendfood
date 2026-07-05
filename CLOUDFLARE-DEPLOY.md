# Migração para Cloudflare Pages (sem quebrar nada)

**Estratégia:** subdomínio de teste → validação → swap de DNS.
**Zero mudança de código.** Zero migração de dados. Supabase continua o mesmo.

---

## Pré-requisitos

- Repo já conectado: `github.com/vbrieno01-hash/trendfood` ✅
- Conta Cloudflare (free): https://dash.cloudflare.com/sign-up
- Acesso ao DNS de `trendfood.site`

---

## Passo 1 — Criar projeto no Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**
2. Autorizar GitHub e selecionar `vbrieno01-hash/trendfood`
3. Configurações de build:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** (em branco)
4. **NÃO clicar Save and Deploy ainda** — adicionar env vars primeiro (Passo 2).

---

## Passo 2 — Variáveis de ambiente (Production + Preview)

Em **Settings → Environment variables**, adicionar (valores no `.env` atual — são
públicas, é a chave anon):

```
VITE_SUPABASE_URL             = https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = <anon key>
VITE_SUPABASE_PROJECT_ID      = <project-id>
NODE_VERSION                  = 20
```

> Aplicar às duas envs: **Production** e **Preview**.
> Secrets de Stripe/Paddle/PIX/FCM/Google **NÃO** vão aqui — continuam nas Edge
> Functions do Supabase (é lá que rodam).

Salvar → **Save and Deploy** (~2 min).

---

## Passo 3 — SPA fallback (deep links no refresh)

Já criei `public/_redirects` com:

```
/*  /index.html  200
```

Lovable ignora esse arquivo; Cloudflare Pages usa para roteamento SPA (React Router).

---

## Passo 4 — Subdomínio `new.trendfood.site`

1. Projeto Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. Digitar `new.trendfood.site`
3. Se `trendfood.site` estiver na Cloudflare, CNAME é criado automático.
   Caso contrário, adicionar no seu registrador:
   ```
   Tipo:  CNAME
   Nome:  new
   Valor: <seu-projeto>.pages.dev
   ```
4. Aguardar propagação (5–30 min) + SSL automático (~2 min).

---

## Passo 5 — Liberar `new.trendfood.site` no Supabase Auth

**Supabase Dashboard → Authentication → URL Configuration**
- **Site URL:** manter `https://trendfood.site` por enquanto
- **Redirect URLs:** adicionar:
  ```
  https://new.trendfood.site
  https://new.trendfood.site/**
  https://<projeto>.pages.dev
  https://<projeto>.pages.dev/**
  ```

Google OAuth → **Google Cloud Console → Credentials → OAuth Client**:
- Authorized JS origins: `https://new.trendfood.site`
- Redirect URIs: `https://new.trendfood.site/auth/callback`

---

## Passo 6 — Checklist de validação em `new.trendfood.site`

- [ ] Landing carrega (imagens/fonts OK)
- [ ] Login email/senha
- [ ] Login Google
- [ ] Cadastro novo (trial ativa)
- [ ] Dashboard carrega dados
- [ ] Cardápio público `/unidade/<slug>`
- [ ] Fluxo pedido → checkout → PIX
- [ ] KDS recebe pedido em tempo real
- [ ] Push notification (PWA mobile)
- [ ] Impressão Bluetooth
- [ ] Painel admin (`brenojackson30@gmail.com`)
- [ ] Webhook Mercado Pago (pedido de R$0,01)
- [ ] Realtime: 2 abas atualizam juntas

---

## Passo 7 — Webhooks

Apontam para **Edge Functions do Supabase** (`*.supabase.co/functions/v1/*`),
não para o frontend. **Nenhuma mudança necessária.** ✅

---

## Passo 8 — Swap de DNS (go-live)

**24h antes:** baixar TTL do A record atual para 300s no seu registrador.

**No dia:**
1. Cloudflare Pages → Custom domains → adicionar `trendfood.site` e `www.trendfood.site`
2. Substituir A records atuais (`185.158.133.1` = Lovable) pelos que a Cloudflare pedir
3. Aguardar 5–15 min. Verificar em https://dnschecker.org
4. Confirmar Site URL no Supabase = `https://trendfood.site`

**Rollback:** voltar os A records para `185.158.133.1` — Lovable ainda serve a
última versão publicada intacta.

---

## Passo 9 — Depois de 48h estáveis

- Remover `https://new.trendfood.site` dos Redirect URLs (limpeza)
- Continuar iterando no Lovable → push → Cloudflare faz deploy automático
- (Opcional) Desligar Publish do Lovable em Project Settings

---

## O que fica igual

- Editor Lovable + IA (você continua iterando aqui)
- Todo push do Lovable → GitHub → Cloudflare Pages faz deploy sozinho
- Supabase (DB, auth, edge functions, cron jobs, RLS) — nada muda
- 11 secrets já configurados nas Edge Functions — permanecem lá

## O que melhora

- Edge global Cloudflare (mais rápido)
- Build logs completos, sem limite de créditos
- Analytics, WAF, cache rules grátis
