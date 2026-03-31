

## Plano: Apagar imagem antiga ao trocar no CMS

### Problema
Quando troca uma imagem, o arquivo antigo permanece no storage. O browser/CDN cacheia a URL antiga e ela "pisca" brevemente ao recarregar.

### Correção
No `ImageUploader` (`SiteContentTab.tsx` linha 49-63):

1. Antes de fazer upload da nova imagem, verificar se `value` (URL atual) aponta para o bucket `site-images`
2. Se sim, extrair o path do arquivo e deletar com `supabase.storage.from("site-images").remove([path])`
3. Usar `crypto.randomUUID()` no nome do arquivo novo (em vez de `Date.now()`) para garantir URL única
4. Setar `cacheControl: "0"` no upload para evitar cache CDN

### Código da mudança

```typescript
async function handleFile(file: File) {
  setUploading(true);
  try {
    // Apagar imagem antiga do storage
    if (value && value.includes("/site-images/")) {
      const oldPath = decodeURIComponent(value.split("/site-images/")[1]);
      await supabase.storage.from("site-images").remove([oldPath]);
    }

    const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 });
    const ext = compressed.name.split(".").pop() || "webp";
    const path = `cms/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, compressed, { cacheControl: "0", upsert: false });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
    onChange(pub.publicUrl);
    toast.success("Imagem enviada!");
  } catch (err: any) {
    toast.error("Erro no upload: " + err.message);
  }
  setUploading(false);
}
```

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/SiteContentTab.tsx` | Função `handleFile` — deletar arquivo antigo + UUID no nome + sem cache |

