

## Plano: Garantir renderização de imagens no GuideTab e AdminGuideTab

### 1. Adicionar loading state e fallback nas imagens do GuideTab
- Adicionar estado `loading` na `<img>` com skeleton/placeholder enquanto carrega
- Adicionar `onError` handler para esconder imagens quebradas ou mostrar fallback
- Manter `loading="lazy"` para performance

### 2. Melhorar preview de imagem no AdminGuideTab
- Adicionar `onError` handler no thumbnail de preview para mostrar ícone de imagem quebrada
- Garantir que o cache-bust (`?t=Date.now()`) funcione corretamente para forçar re-render após upload

### 3. Testar o fluxo end-to-end
- Verificar que o upload no admin salva no bucket e no banco
- Verificar que o GuideTab carrega e renderiza as imagens automaticamente
- Verificar fallback para imagens com URL inválida

### Alterações
- **`src/components/dashboard/GuideTab.tsx`**: Envolver `<img>` com container que mostra skeleton durante load e fallback em erro
- **`src/components/admin/AdminGuideTab.tsx`**: Adicionar `onError` no thumbnail preview

