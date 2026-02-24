

## Diagnóstico: Foto do Cardápio Não Salva no APK

### Problema identificado

O fluxo nativo de câmera (`pickPhotoNative`) usa `fetch()` com Data URI para converter base64 em Blob:

```typescript
const response = await fetch(`data:${mimeType};base64,${photo.base64String}`);
const blob = await response.blob();
```

Em muitos WebViews Android, `fetch()` com `data:` URIs **falha silenciosamente** ou retorna um blob vazio. Isso faz com que o `File` criado tenha 0 bytes, e o upload para o storage não funciona (ou faz upload de um arquivo vazio).

Além disso, se qualquer erro ocorre dentro de `handleNativePhoto`, o `catch` mostra um toast genérico mas não impede o formulário de ser submetido — o item é salvo **sem imagem** porque `form.imageFile` permanece `null`.

### Correção

1. **`src/lib/nativeCamera.ts`** — Substituir `fetch(data:...)` por conversão manual com `atob()` + `Uint8Array`, que funciona em 100% dos WebViews Android:

```typescript
const byteString = atob(photo.base64String);
const bytes = new Uint8Array(byteString.length);
for (let i = 0; i < byteString.length; i++) {
  bytes[i] = byteString.charCodeAt(i);
}
const blob = new Blob([bytes], { type: mimeType });
```

2. **`src/components/dashboard/MenuTab.tsx`** — Adicionar log de diagnóstico no `handleNativePhoto` para confirmar que o File foi criado com tamanho > 0, e mostrar toast de sucesso quando a foto é selecionada.

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/nativeCamera.ts` | Trocar `fetch(data:...)` por `atob` + `Uint8Array` |
| `src/components/dashboard/MenuTab.tsx` | Adicionar feedback visual quando foto é capturada com sucesso |

### Após implementar

Rodar novamente na raiz do projeto:
```
git pull
npm run build
npx cap sync
cd android
.\gradlew.bat assembleDebug
```

