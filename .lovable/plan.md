

## Plano: Remover opção "Take Picture" e abrir direto a galeria

### O que muda

**Arquivo:** `src/lib/nativeCamera.ts`

Na linha 16, trocar `CameraSource.Prompt` por `CameraSource.Photos`:

```text
ANTES:  source: CameraSource.Prompt,  // mostra "Take Picture" + "Gallery"
DEPOIS: source: CameraSource.Photos,  // abre direto a galeria, sem prompt
```

Isso elimina a tela intermediária com "Take Picture" e abre diretamente a galeria de fotos do dispositivo.

### Nenhuma outra mudança necessária
- O resto do fluxo (conversão base64, upload, preview) permanece igual.

