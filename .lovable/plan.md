
Objetivo: impedir definitivamente que o modal de “Novo item” feche sozinho no APK durante o fluxo da galeria/câmera.

Contexto confirmado no código atual:
- `MenuTab.tsx` já bloqueia `onInteractOutside` e `onPointerDownOutside`.
- O fechamento ainda acontece no APK, então existe outro gatilho de fechamento do Radix/Dialog (principalmente perda de foco e/ou evento de close disparado no `onOpenChange` quando o app volta da galeria).

Plano de implementação

1) Blindar o terceiro gatilho de fechamento (focus)
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Em `<DialogContent />`, adicionar:
  - `onFocusOutside={(e) => e.preventDefault()}`
- Motivo: no Android, ao abrir galeria/câmera o WebView perde foco; isso costuma disparar fechamento por “focus outside”.

2) Proteger o estado `modalOpen` contra closes automáticos durante picker nativo
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Criar um `ref` de controle, ex.:
  - `const nativePickerInFlightRef = useRef(false);`
- Trocar `onOpenChange={setModalOpen}` por handler protegido:
  - Se `nextOpen === false` e `nativePickerInFlightRef.current === true`, ignorar fechamento.
  - Caso contrário, aplicar `setModalOpen(nextOpen)`.
- Motivo: mesmo bloqueando eventos “outside”, o Dialog pode emitir close ao retorno do app; esse guard impede fechamento não intencional.

3) Marcar início/fim do fluxo nativo no `handleNativePhoto`
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Em `handleNativePhoto`:
  - Antes de `pickPhotoNative()`: `nativePickerInFlightRef.current = true`
  - No `finally`: liberar com pequeno atraso (ex. 250–400ms) para cobrir eventos tardios de resume/focus:
    - `setTimeout(() => { nativePickerInFlightRef.current = false; }, 300);`
- Motivo: evita race condition em que o close chega logo após retorno da galeria.

4) (Opcional de robustez) bloquear Escape apenas durante picker nativo
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Em `<DialogContent />`:
  - `onEscapeKeyDown={(e) => { if (nativePickerInFlightRef.current) e.preventDefault(); }}`
- Motivo: alguns dispositivos mapeiam retorno/foco de forma parecida com “dismiss”.

5) Não alterar fluxo de upload já corrigido
- Manter comportamento atual:
  - Upload da imagem no storage imediato
  - Persistência no banco apenas no submit (“Salvar alterações”)

Validação (teste obrigatório no APK)

Checklist de teste ponta a ponta:
1. Abrir “Novo item”.
2. Clicar “Adicionar foto”.
3. Escolher imagem na galeria.
4. Confirmar que o modal permanece aberto com preview da foto.
5. Preencher nome/preço/categoria e salvar.
6. Confirmar item criado com imagem.
7. Repetir no fluxo “Editar item” para garantir que não houve regressão.
8. Testar cancelar/fechar no X para validar que o fechamento manual continua funcionando.

Detalhes técnicos (se você quiser saber o porquê)
- O Dialog do Radix pode fechar por múltiplas vias: pointer outside, interact outside, focus outside e open-change programático.
- No Android (Capacitor), abrir câmera/galeria tira foco da WebView e pode disparar fechamento mesmo sem clique fora.
- Por isso a correção precisa de duas camadas:
  1) bloquear eventos de outside/focus,
  2) proteger `onOpenChange` enquanto o picker nativo está ativo.
