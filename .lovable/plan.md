

## Plano: Upload imediato ao storage, mas salvar no banco só ao clicar "Salvar alterações"

### Problema
O código atual salva a `image_url` direto no banco quando o usuário seleciona a foto (para itens existentes). O usuário quer que a foto só seja persistida no banco ao clicar "Salvar alterações".

### Correção

**Arquivo:** `src/components/dashboard/MenuTab.tsx`

Remover o bloco que faz `supabase.from("menu_items").update(...)` e `queryClient.invalidateQueries(...)` de dentro do `doImmediateUpload`. O upload ao storage continua imediato (para não perder o File no Android), mas a URL fica apenas no state do form (`form.image_url`) até o submit.

O `doImmediateUpload` ficará assim:
```text
1. Upload file to storage → URL
2. Guardar URL no form state (form.image_url)
3. Mostrar preview da foto no modal
4. Toast "Foto enviada ✓"
— NÃO salva no banco —
```

Quando o usuário clicar "Salvar alterações":
```text
handleSubmit → updateMutation com form.image_url → banco atualizado
```

### Mudança específica

No `doImmediateUpload`, remover as linhas 112-120 (o `if (editItem)` que faz update direto no banco). Manter apenas o upload ao storage + set do state + toast genérico.

