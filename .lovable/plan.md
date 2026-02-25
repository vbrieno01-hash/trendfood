

# Plano: Comprimir imagens antes do upload ao Storage

## Problema

Atualmente, as imagens são enviadas ao Storage no tamanho original. Fotos de celular podem ter 5-10 MB, tornando o upload lento e consumindo armazenamento desnecessário. Isso afeta logos, imagens do cardápio e banners.

## O que será feito

Criar uma função utilitária `compressImage` em `src/lib/compressImage.ts` que usa a Canvas API nativa do browser para redimensionar e comprimir imagens antes do upload. Depois, integrar essa função em todos os pontos de upload.

## Seção técnica

### 1. Novo arquivo: `src/lib/compressImage.ts`

- Recebe um `File` e opções (`maxWidth`, `maxHeight`, `quality`)
- Usa `createImageBitmap` + `<canvas>` para redimensionar mantendo proporção
- Converte para WebP (com fallback para JPEG) via `canvas.toBlob()`
- Valores padrão: max 1200px, quality 0.8
- Retorna um novo `File` comprimido
- Se o arquivo não for imagem, retorna o original sem alterar

```text
compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
  → File (webp ou jpeg, ~100-300KB ao invés de 5MB)
```

### 2. Integrar nos 3 pontos de upload existentes

```text
Arquivo: src/hooks/useMenuItems.ts (função uploadMenuImage)
  - Antes do upload, chamar compressImage(file)
  - Atualizar extensão do path para usar o formato comprimido

Arquivo: src/components/dashboard/StoreProfileTab.tsx
  - Upload de logo (~linha 206): comprimir antes de enviar
  - Upload de banner (~linha 251): comprimir antes de enviar

Arquivo: src/components/admin/AdminDownloadsSection.tsx
  - NÃO comprimir: são arquivos .apk/.exe, não imagens
```

### 3. Detalhes da compressão

- Formato de saída: WebP (suportado por todos os browsers modernos)
- Fallback: JPEG se WebP não for suportado
- Imagens menores que o limite não são redimensionadas (só recomprimidas)
- Log no console com tamanho antes/depois para debug

