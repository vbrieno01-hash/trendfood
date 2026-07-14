# Blocos 3 e 4 — Instruções para colar no chat do `trendfood2027`

> Este arquivo é só documentação. Nada aqui roda em produção.
> Copie a mensagem da seção 1 no chat do projeto remixado
> `trendfood2027` (vinculado ao Supabase alvo `eqyklkrigshbjuneuxrz`).

---

## 1) Mensagem para colar no chat do `trendfood2027`

```
Executar Blocos 3 e 4 da migração no Supabase deste projeto (eqyklkrigshbjuneuxrz).
NÃO tocar em nenhum outro projeto.

Bloco 3 — Auth (configure_auth + configure_social_auth):
- Site URL: https://trendfood.site
- Redirect URLs (allow-list):
  - https://trendfood.site/**
  - https://www.trendfood.site/**
  - https://trendfood.lovable.app/**
  - http://localhost:8080/**
- disable_signup: false
- auto_confirm_email: false
- external_anonymous_users_enabled: false
- password_hibp_enabled: true
- Social: habilitar Google (managed). Manter email/password ativo (NÃO desabilitar).

Bloco 4 — Storage buckets (nomes EXATOS iguais aos de produção):
- logos              (público)
- menu-images        (público)
- guide-images       (público)
- site-images        (público)
- downloads          (público)
- support-attachments (privado)

Depois de criar os buckets, rodar a migration de RLS policies em storage.objects
(SQL exato está em docs/migration-delta/blocos-3-4-instrucoes.md seção 3).
```

---

## 2) Buckets — origem dos nomes

Extraído de produção (`storage.buckets`) em 2026-07-14:

| Bucket                | Público | Uso                                              |
|-----------------------|---------|--------------------------------------------------|
| `logos`               | sim     | Logos das lojas                                  |
| `menu-images`         | sim     | Fotos de itens do cardápio                       |
| `guide-images`        | sim     | Imagens dos guias (admin)                        |
| `site-images`         | sim     | Assets da landing page (admin)                   |
| `downloads`           | sim     | APK/EXE (global + por loja)                      |
| `support-attachments` | não     | Anexos do chat de suporte (lojista ↔ admin)      |

> `database_export_09_07_26` é bucket temporário de backup — **não recriar**.

---

## 3) SQL de RLS policies (rodar via `supabase--migration` no chat do `trendfood2027` após criar os buckets)

Espelha exatamente as policies de produção. Idempotente (usa `DROP POLICY IF EXISTS`).

```sql
-- storage.objects já vem com RLS habilitado; garantir só por segurança
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============ logos (público) ============
DROP POLICY IF EXISTS logos_select_public       ON storage.objects;
DROP POLICY IF EXISTS logos_insert_authenticated ON storage.objects;
DROP POLICY IF EXISTS logos_update_authenticated ON storage.objects;
DROP POLICY IF EXISTS logos_delete_authenticated ON storage.objects;

CREATE POLICY logos_select_public ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logos');
CREATE POLICY logos_insert_authenticated ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY logos_update_authenticated ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY logos_delete_authenticated ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'logos');

-- ============ menu-images (público) ============
DROP POLICY IF EXISTS menu_images_public_select ON storage.objects;
DROP POLICY IF EXISTS menu_images_auth_insert   ON storage.objects;
DROP POLICY IF EXISTS menu_images_auth_update   ON storage.objects;
DROP POLICY IF EXISTS menu_images_auth_delete   ON storage.objects;

CREATE POLICY menu_images_public_select ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'menu-images');
CREATE POLICY menu_images_auth_insert ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY menu_images_auth_update ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY menu_images_auth_delete ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- ============ guide-images (público leitura, admin escreve) ============
DROP POLICY IF EXISTS guide_images_select_public ON storage.objects;
DROP POLICY IF EXISTS guide_images_insert_admin  ON storage.objects;
DROP POLICY IF EXISTS guide_images_update_admin  ON storage.objects;
DROP POLICY IF EXISTS guide_images_delete_admin  ON storage.objects;

CREATE POLICY guide_images_select_public ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'guide-images');
CREATE POLICY guide_images_insert_admin ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY guide_images_update_admin ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY guide_images_delete_admin ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'guide-images' AND public.has_role(auth.uid(), 'admin'));

-- ============ site-images (público leitura, admin escreve) ============
DROP POLICY IF EXISTS site_images_select_public ON storage.objects;
DROP POLICY IF EXISTS site_images_insert_admin  ON storage.objects;
DROP POLICY IF EXISTS site_images_update_admin  ON storage.objects;
DROP POLICY IF EXISTS site_images_delete_admin  ON storage.objects;

CREATE POLICY site_images_select_public ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'site-images');
CREATE POLICY site_images_insert_admin ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY site_images_update_admin ON storage.objects
  FOR UPDATE TO public
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY site_images_delete_admin ON storage.objects
  FOR DELETE TO public
  USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

-- ============ downloads (público leitura; escrita: admin em /global ou dono da org em /<org_id>) ============
DROP POLICY IF EXISTS downloads_select_public   ON storage.objects;
DROP POLICY IF EXISTS admin_upload_global       ON storage.objects;
DROP POLICY IF EXISTS admin_update_global       ON storage.objects;
DROP POLICY IF EXISTS downloads_insert_owner    ON storage.objects;
DROP POLICY IF EXISTS downloads_update_owner    ON storage.objects;
DROP POLICY IF EXISTS downloads_delete_owner    ON storage.objects;

CREATE POLICY downloads_select_public ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'downloads');

CREATE POLICY admin_upload_global ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'downloads'
    AND (storage.foldername(name))[1] = 'global'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY admin_update_global ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'downloads'
    AND (storage.foldername(name))[1] = 'global'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY downloads_insert_owner ON storage.objects
  FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'downloads'
    AND auth.uid() = (
      SELECT o.user_id FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY downloads_update_owner ON storage.objects
  FOR UPDATE TO public
  USING (
    bucket_id = 'downloads'
    AND auth.uid() = (
      SELECT o.user_id FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY downloads_delete_owner ON storage.objects
  FOR DELETE TO public
  USING (
    bucket_id = 'downloads'
    AND auth.uid() = (
      SELECT o.user_id FROM public.organizations o
      WHERE o.id::text = (storage.foldername(name))[1]
    )
  );

-- ============ support-attachments (privado; dono da org OU admin) ============
DROP POLICY IF EXISTS "support: store reads own attachments"   ON storage.objects;
DROP POLICY IF EXISTS "support: store uploads own attachments" ON storage.objects;

CREATE POLICY "support: store reads own attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
          AND o.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY "support: store uploads own attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.user_id = auth.uid()
          AND o.id::text = (storage.foldername(name))[1]
      )
    )
  );
```

> Pré-requisito: função `public.has_role(uuid, app_role)` já precisa existir no
> alvo (vem no `schema-delta.sql` / migrations do projeto). Se der erro
> "function has_role does not exist", rodar antes as migrations base.

---

## 4) Checklist de verificação pós-execução

No Studio do `eqyklkrigshbjuneuxrz`:

- [ ] Authentication → URL Configuration → Site URL = `https://trendfood.site`
- [ ] Authentication → URL Configuration → Redirect URLs contém as 4 entradas
- [ ] Authentication → Providers → Google = **Enabled** (managed)
- [ ] Authentication → Providers → Email = **Enabled**
- [ ] Authentication → Providers → Anonymous = **Disabled**
- [ ] Authentication → Policies → HIBP = **On**
- [ ] Storage → 6 buckets criados com o `public` correto
- [ ] SQL de verificação (rodar no SQL Editor do alvo):
  ```sql
  SELECT id, public FROM storage.buckets ORDER BY id;
  SELECT policyname FROM pg_policies
   WHERE schemaname='storage' AND tablename='objects'
   ORDER BY policyname;
  ```
  Deve listar os 6 buckets + as 23 policies acima.

---

## 5) O que NÃO fazer neste chat (produção)

- ❌ Rodar `configure_auth` / `configure_social_auth` aqui → mudaria Site URL da produção.
- ❌ Rodar `storage_create_bucket` aqui → tentaria recriar buckets que já existem em produção.
- ❌ Rodar a migration da seção 3 aqui → sobrescreveria policies vivas.

Tudo isso só no chat do `trendfood2027`.