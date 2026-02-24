

## Diagnóstico: Foto selecionada mas não salva

### Problema encontrado

O bucket `menu-images` no storage tem políticas de SELECT (público), UPDATE e DELETE para usuários autenticados, mas **não tem política de INSERT**. Isso significa que o upload do arquivo é rejeitado silenciosamente pelo backend — a foto é selecionada no celular mas nunca chega ao servidor.

### Correção

Adicionar a política de INSERT que está faltando no bucket `menu-images`:

```sql
CREATE POLICY "menu_images_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images'
  AND auth.role() = 'authenticated'
);
```

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar política de INSERT no storage `menu-images` |

Nenhuma mudança de código é necessária. Após a migração, o upload vai funcionar tanto no APK quanto na web.

### Após implementar

Gerar novo APK com a sequência habitual:
```text
git pull
npm run build
npx cap sync
cd android
.\gradlew.bat assembleDebug
```

