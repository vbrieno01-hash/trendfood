# Bloco 5 — Runbook do dia do dump/restore

**Origem:** `xrzudhylpphnzousilye` (prod Lovable Cloud)
**Destino:** `eqyklkrigshbjuneuxrz` (espelho Supabase próprio)
**Janela sugerida:** madrugada de terça (~03:00-04:00).
**Duração estimada:** 20-40 min.

---

## 0. Baseline de validação (rodar ANTES da janela, no PROD)

```sql
SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.organizations) AS orgs,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.order_items) AS order_items,
  (SELECT count(*) FROM public.menu_items) AS menu_items,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.user_roles) AS user_roles,
  (SELECT count(*) FROM public.deliveries) AS deliveries,
  (SELECT count(*) FROM public.campaigns) AS campaigns,
  (SELECT count(*) FROM public.loyalty_points) AS loyalty,
  (SELECT count(*) FROM public.reviews) AS reviews,
  (SELECT count(*) FROM public.affiliates) AS affiliates;
```

**Baseline 14/07/2026:**

| Tabela | Rows |
|---|---|
| auth.users | 26 |
| organizations | 20 |
| orders | 3.429 |
| order_items | 5.341 |
| menu_items | 432 |
| profiles | 83 |
| user_roles | 2 |
| deliveries | 2.864 |
| campaigns | 5 |
| loyalty_points | 75 |
| reviews | 153 |
| affiliates | 6 |

Re-rode antes da janela e salve num arquivo — os números crescem todo dia.

---

## 1. Preparação (24h antes)

- [ ] Avisar lojistas: "manutenção 03:00-04:00, ~30min off"
- [ ] Baixar Storage do prod (uma vez por bucket):
  - `logos/`
  - `menu-images/` ⚠️ mais pesado
  - `guide-images/`
  - `site-images/`
  - `downloads/`
  - `support-attachments/`

  Storage → bucket → Download.

- [ ] Confirmar secrets do Bloco 2 configurados no espelho
- [ ] Criar 1 usuário teste no espelho e logar (validar auth antes)
- [ ] Confirmar plano **Pro** do prod (necessário pro backup nativo)

---

## 2. Dump do prod (dentro da janela)

**Opção recomendada — Backup nativo do Supabase Pro:**

1. Prod → **Database → Backups** → backup mais recente (< 24h)
2. **Download** → salva local (`.dump` custom format)

**Alternativa — pg_dump manual:**

```bash
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=auth \
  --schema=public \
  --file=trendfood-cutover.dump \
  "postgresql://postgres:<SENHA>@db.xrzudhylpphnzousilye.supabase.co:5432/postgres"
```

---

## 3. Restore no espelho

### 3a. Limpar dados vazios (se o remix tem seed vazio)

No SQL Editor do **espelho**:

```sql
SET session_replication_role = replica;

TRUNCATE
  public.order_items,
  public.orders,
  public.menu_item_addons,
  public.menu_item_ingredients,
  public.menu_items,
  public.deliveries,
  public.organizations,
  public.profiles,
  public.user_roles
  RESTART IDENTITY CASCADE;

SET session_replication_role = origin;
```

### 3b. Restore do dump

Senha do banco do espelho: Project Settings → Database.

```bash
pg_restore \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  --dbname="postgresql://postgres:<SENHA_ESPELHO>@db.eqyklkrigshbjuneuxrz.supabase.co:5432/postgres" \
  trendfood-cutover.dump
```

Flags críticas:
- `--no-owner` — roles diferentes
- `--no-privileges` — mantém GRANTs do espelho
- `--disable-triggers` — evita conflito de FK

Warnings tipo `role "supabase_admin" does not exist` — ignora, esperado.

---

## 4. Restore do Storage

Por bucket:
- Studio: **Storage → bucket → Upload folder**
- CLI: `supabase storage cp -r ./backups/menu-images ss:///menu-images --experimental`

Paths precisam ser idênticos (ex: `menu-images/<org_id>/<file>.jpg`).

---

## 5. Recriar pg_cron jobs

Roda `bloco-5-cron.sql.template` DEPOIS de trocar:

- `__NEW_PROJECT_REF__` → `eqyklkrigshbjuneuxrz`
- `__NEW_ANON_KEY__` → pega em Settings → API Keys do espelho

Cola no SQL Editor do espelho e roda.

---

## 6. Habilitar Realtime

Roda `bloco-5-realtime.sql` no SQL Editor do espelho.

---

## 7. Validação final

No espelho:

```sql
SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.organizations) AS orgs,
  (SELECT count(*) FROM public.orders) AS orders,
  (SELECT count(*) FROM public.order_items) AS order_items,
  (SELECT count(*) FROM public.menu_items) AS menu_items,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.deliveries) AS deliveries;
```

Números têm que bater com o passo 0.

Funcional:
- [ ] Login email real (senha antiga funciona)
- [ ] Login Google funciona
- [ ] Abrir imagem de menu no browser
- [ ] `SELECT count(*) FROM cron.job;` retorna 26+
- [ ] `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';` retorna 19

---

## 8. Rollback

Enquanto o `.env` do frontend apontar pro prod, o espelho é só cópia parada. Se der ruim:

```sql
SET session_replication_role = replica;
TRUNCATE public.orders, public.order_items, public.deliveries, public.menu_items,
         public.organizations, public.profiles, public.user_roles CASCADE;
SET session_replication_role = origin;
```

E refaz. Prod nunca foi tocado.

---

## Próximo — Bloco 6

Trocar `.env` (Vercel/Lovable) com URL/keys do espelho + repontar webhooks externos (MP, iFood, Cakto, UAZAPI, Telegram). **Aí sim** o corte acontece.
