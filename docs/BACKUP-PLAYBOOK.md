# Playbook de Backup — TrendFood

Rotina manual simples para garantir que, se o Lovable Cloud sumir amanhã, você
consegue reerguer o negócio em outro Supabase em até 1 dia.

Tudo aqui é **manual**. Versão automatizada via `pg_cron` + Telegram fica como
evolução opcional (seção 4).

---

## 1. Rotina semanal (sábado, ~5 minutos)

Export CSV das tabelas que mudam todo dia.

1. Abrir **Cloud → Database → Tables**.
2. Para cada tabela abaixo, clicar no ícone de **export → CSV**:
   - `organizations`
   - `orders`
   - `order_items`
   - `menu_items`
   - `customers`
   - `loyalty_points`
3. Salvar em pasta local: `backups/AAAA-MM-DD/semana/`.
4. Subir a pasta para Google Drive / OneDrive / HD externo.

---

## 2. Rotina mensal (1º domingo do mês, ~15 minutos)

Além das 6 acima, exportar também:

- `couriers`
- `affiliates`
- `platform_config`
- `platform_plans`
- `user_roles`
- `push_subscriptions`
- `categories`
- `addons` / `global_addons`
- `delivery_neighborhoods`
- `stock_items`
- `subscriptions`

Salvar em `backups/AAAA-MM-DD/mensal/`.

---

## 3. Rotina trimestral (~30 minutos) — Storage

Imagens não saem em CSV. Baixar buckets manualmente:

1. **Cloud → Storage** no Lovable.
2. Para cada bucket, baixar todos os arquivos:
   - `logos`
   - `menu-images` (este é o pesado — pode ter centenas de fotos)
   - `downloads` (APK/EXE)
   - `guide-images`
   - `site-images`
3. Salvar em `backups/AAAA-MM-DD/storage/<bucket>/`.

**Atalho via script (executar localmente, não no projeto):**

```bash
# Requer SUPABASE_SERVICE_ROLE_KEY do projeto
npx supabase storage cp -r ss:///menu-images ./backups/menu-images --experimental
```

---

## 4. Estrutura de pastas sugerida

```
backups/
├── 2026-05-17/
│   └── semana/
│       ├── organizations.csv
│       ├── orders.csv
│       └── ...
├── 2026-06-07/
│   ├── semana/
│   └── mensal/
└── 2026-08-01/
    ├── semana/
    ├── mensal/
    └── storage/
        ├── logos/
        ├── menu-images/
        └── ...
```

Manter pelo menos: 4 últimas semanais + 6 últimas mensais + 4 últimas trimestrais.

---

## 5. (Opcional) Automação futura via pg_cron + Telegram

Quando quiser parar de fazer manual, criar uma edge function `weekly-backup` que:

1. Roda `select * from <tabela>` e gera CSV em memória.
2. Envia o CSV como `sendDocument` para o Telegram do dono via `TELEGRAM_API_KEY`.
3. É disparada toda segunda às 03:00 via `pg_cron`:

```sql
select cron.schedule(
  'weekly-backup',
  '0 3 * * 1',
  $$ select net.http_post(
       url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/weekly-backup',
       headers := '{"Authorization":"Bearer <service_role>"}'::jsonb
     ); $$
);
```

**Não implementar agora** — fica como evolução depois que a rotina manual
estiver consolidada.

---

## 6. Validação anual (importante)

Uma vez por ano, **simular o restore** num Supabase free novo:

1. Criar projeto Supabase grátis em supabase.com.
2. Importar o último CSV de `organizations` via UI.
3. Verificar se as colunas batem.

Isso garante que os CSVs não estão corrompidos e que o schema continua
compatível. Não precisa importar tudo — uma tabela já valida o formato.

---

## 7. O que NÃO está coberto por backup manual

- **`auth.users`** (hashes bcrypt) — só sai via `pg_dump` completo na hora da
  migração. Não dá para exportar via UI. Mitigação: na migração real, pedir
  dump completo ao suporte do Lovable.
- **Sessões ativas** — usuários relogam 1x.
- **Jobs `pg_cron`** — não exportáveis via UI; recriar via migration SQL.
- **Realtime publications** — recriar manualmente.

Isso tudo é tratado em `docs/MIGRATION-PLAN.md` quando/se migrar.