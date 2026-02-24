

## Diagnóstico: Foto enviada mas não salva no banco

### Evidência no banco de dados

Encontrei **6 fotos enviadas ao storage** nos últimos minutos, mas **nenhuma delas está vinculada a nenhum item do cardápio**:

```text
Storage (uploads recentes):         Menu Items (image_url):
─────────────────────────────       ─────────────────────────
a5f2c8e9...jpg  ✓ (16:44)          Nenhum item com essa URL
71bcfd70...jpg  ✓ (16:43)          Nenhum item com essa URL
f3539033...jpg  ✓ (16:43)          Nenhum item com essa URL
b44d206b...jpg  ✓ (16:43)          Nenhum item com essa URL
0cf29037...jpg  ✓ (16:41)          Nenhum item com essa URL
665b0524...jpg  ✓ (16:40)          Nenhum item com essa URL
```

O upload funciona, mas a URL **nunca chega ao banco**. Ou o usuario nao clica "Salvar" (achando que a foto ja salvou), ou o submit falha silenciosamente.

### Causa raiz

O fluxo atual exige dois passos separados: (1) selecionar foto, (2) clicar "Salvar alterações". No Perfil da Loja, o upload **salva direto no banco** no momento da seleção. No Cardápio, a URL fica apenas no estado React e depende de um segundo clique.

### Correção: Salvar foto direto no banco (igual ao Perfil da Loja)

Quando o item **já existe** (edição), ao selecionar a foto, além de fazer upload ao storage, vamos **atualizar o `image_url` no banco imediatamente**. Para **novos itens**, a URL continua no state e é salva junto com o insert.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/MenuTab.tsx` | `doImmediateUpload`: se `editItem` existe, faz `UPDATE menu_items SET image_url = url WHERE id = editItem.id` direto no banco + invalida cache React Query |

### Detalhe da implementação

**`doImmediateUpload`** recebe o `editItem` como parâmetro opcional. Se presente:

```text
1. Upload file to storage → URL
2. UPDATE menu_items SET image_url = URL WHERE id = editItem.id
3. Invalidar queryKey ["menu_items", orgId]
4. Toast "Foto salva ✓"
```

Se `editItem` é null (novo item):

```text
1. Upload file to storage → URL
2. Guardar URL no form state
3. Toast "Foto enviada ✓"
4. URL será incluída no INSERT quando clicar "Salvar"
```

Nenhuma mudança no `useMenuItems.ts` é necessária — o update será feito direto via `supabase.from("menu_items").update(...)` no componente.

### Após implementar

```text
git pull → npm run build → npx cap sync → cd android → .\gradlew.bat assembleDebug
```

