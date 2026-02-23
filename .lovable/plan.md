

# Corrigir busca case-insensitive nos downloads do GitHub

## O que muda

Os botoes de download do APK e EXE vao encontrar o arquivo no GitHub independente de como ele foi nomeado — seja `trendFood.apk`, `TrendFood.apk`, `TRENDFOOD.APK` ou qualquer variacao.

## Secao Tecnica

### Arquivo: `src/components/dashboard/PrinterTab.tsx`

Na funcao `findAssetUrl` (linha 52), alterar a comparacao de nomes para ignorar maiusculas/minusculas:

```typescript
// De:
const asset = release.assets?.find((a: any) => a.name === filename);

// Para:
const asset = release.assets?.find(
  (a: any) => a.name.toLowerCase() === filename.toLowerCase()
);
```

Apenas essa linha precisa mudar. Resolve o problema atual onde o arquivo se chama `trendFood.apk` no GitHub mas o codigo busca `trendfood.apk`.

