

## Diagnóstico: Modal fecha sozinho ao abrir câmera no APK

### Causa raiz

No Android, quando o plugin `@capacitor/camera` abre a câmera ou galeria, a Activity do app vai para background. O Radix Dialog interpreta isso como uma interação "fora" do modal e dispara `onInteractOutside`, que chama `setModalOpen(false)` — fechando o modal antes mesmo de o usuário escolher a foto.

No navegador isso não acontece porque o file picker não tira o foco do mesmo jeito.

### Correção

**Arquivo:** `src/components/dashboard/MenuTab.tsx`

Adicionar `onInteractOutside` e `onPointerDownOutside` no `DialogContent` para bloquear o fechamento automático durante o fluxo de foto:

```text
<DialogContent
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

Isso impede que o Dialog feche quando:
- A câmera/galeria abre no Android (Activity vai para background)
- O usuário toca fora do modal acidentalmente no celular

O modal só fecha por:
- Clique no botão "Cancelar"
- Clique no X do modal
- Submit com sucesso ("Salvar alterações")

### Mudança exata

Linha 348 do `MenuTab.tsx`:
```text
ANTES:
<DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">

DEPOIS:
<DialogContent
  className="max-w-md max-h-[90vh] overflow-y-auto"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

Nenhuma outra mudança necessária.

### Após implementar

```text
git pull → npm run build → npx cap sync → cd android → .\gradlew.bat assembleDebug
```

