

## Plano: Adicionar campo de URL de imagem no formulário de produto

### O que será feito
Adicionar um campo de texto para colar URL de imagem diretamente no formulário de criar/editar produto, como alternativa ao upload de arquivo.

### Arquivo alterado

**`src/components/dashboard/MenuTab.tsx`**

1. Abaixo do botão "Adicionar foto" (linha ~1066), adicionar um divisor "ou" e um campo `Input` com placeholder "Cole a URL da imagem aqui..."
2. Quando o usuário colar uma URL:
   - Atualizar `form.image_url` com o valor digitado
   - Atualizar `imagePreview` para mostrar a prévia da imagem
   - Limpar `form.imageFile` (URL tem prioridade sobre arquivo local)
3. No `handleSubmit` (linha ~755): se `form.image_url` já é uma URL válida e não há `imageFile`, usar direto sem upload — esse fluxo já funciona naturalmente
4. Ao selecionar um arquivo via botão, limpar o campo de URL para evitar conflito

### Visual
```text
[Prévia 80x80]  [📷 Adicionar foto]
                 JPG, PNG ou WebP. Máx 5MB.
                 ── ou ──
                 [  Cole a URL da imagem aqui...  ]
```

