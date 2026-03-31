

## Bug encontrado: `upsert` falha silenciosamente para chaves novas

### Problema
No `usePlatformContent.ts`, a função `upsert` faz:
1. `.update({ value }).eq("key", key)` 
2. Se `updateError` → faz `.insert()`

O problema: quando a chave não existe, o Supabase **não retorna erro** no update — retorna sucesso com `count: 0`. Então o insert nunca executa, e a chave nova se perde silenciosamente.

### Correção
Usar o método `.upsert()` nativo do Supabase, que faz INSERT ou UPDATE automaticamente baseado na constraint unique da coluna `key`.

### Arquivo a modificar

**`src/hooks/usePlatformContent.ts`** — função `upsert` (linha 51-66):

Substituir a lógica atual por:
```typescript
async function upsert(key: string, value: any) {
  await (supabase.from("platform_content") as any)
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  cache = null;
  cacheTime = 0;
  await load();
}
```

### Impacto
- Corrige criação de novas chaves CMS pelo admin
- Simplifica o código (de 10 linhas para 5)
- Zero risco de quebrar chaves existentes

