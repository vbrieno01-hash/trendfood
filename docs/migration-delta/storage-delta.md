# Storage — Delta desde 2026-07-09

## Bucket novo: `support-attachments`

Bucket privado usado pelo chat de suporte 1:1 (fotos que o lojista envia
ao admin). Path: `{org_id}/{uuid}.{ext}`.

### 1. Criar no Studio

**Storage → New bucket**
- Nome: `support-attachments`
- Public: **NÃO** (privado)

### 2. Policies (cole no SQL Editor)

```sql
-- Lojista pode ler seus próprios arquivos
CREATE POLICY "support: owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (
    -- prefixo do path é uma org que o usuário é dono
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = o.id::text
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Lojista pode inserir arquivos na pasta da própria org
CREATE POLICY "support: owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.owner_id = auth.uid()
      AND (storage.foldername(name))[1] = o.id::text
  )
);

-- Admin lê tudo
CREATE POLICY "support: admin read all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND public.has_role(auth.uid(), 'admin')
);
```

## Outros buckets (verificar se já existem no espelho)

- `logos` (public)
- `menu-images` (public)
- `guides` (public)
- `campaign-media` (public — se addon WhatsApp permitir mídia)

Se algum estiver faltando, criar no Studio e replicar as policies do
projeto atual.
