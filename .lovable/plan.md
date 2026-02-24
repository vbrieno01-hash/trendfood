
Objetivo: corrigir definitivamente o fechamento do modal no APK Android após escolher foto, mesmo quando o upload retorna sucesso.

Diagnóstico consolidado
- Pela evidência do print:
  - Toast “Foto enviada ✓” aparece.
  - O modal some e a tela volta para “Cardápio vazio”.
- Isso indica que o upload conclui, mas o estado local `modalOpen` é perdido.
- O modal já é React puro (sem Radix), então o próximo suspeito forte é remount do `MenuTab`/árvore do dashboard durante ciclo de vida Android (pause/resume ao abrir galeria).
- Do I know what the issue is? Sim: o problema principal não é “click outside”; é perda de estado local do modal após ciclo nativo da galeria.

Plano de implementação (correção robusta, sem depender do ciclo do componente)

1) Tornar o estado do modal/draft persistente (sobrevive remount)
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Criar persistência de rascunho em `sessionStorage` (ou `localStorage`) com chave por organização, por exemplo:
  - `menu_modal_draft_v2:${organization.id}`
- Persistir:
  - `modalOpen`
  - `editItemId` (ou flag novo/edição)
  - `form` (nome, descrição, preço, categoria, available, image_url)
  - `imagePreview`
  - timestamp
- Restaurar no mount:
  - Se houver draft “aberto”, reidratar estado e reabrir modal automaticamente.
- Limpar draft quando:
  - usuário clica Cancelar
  - submit conclui com sucesso

2) Reforçar restauração no retorno do app ao foreground (Android)
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Adicionar listener nativo de ciclo de vida (`@capacitor/app`, `appStateChange`).
- Quando `isActive === true`, executar rotina de “rehydrate draft” (idempotente), para reabrir modal caso o componente tenha sido reconstruído durante ida à galeria.

3) Simplificar fluxo de seleção de imagem para reduzir risco de lifecycle
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Remover dependência do caminho “native camera picker” nesse formulário e usar um único fluxo de seleção via input file (`fileRef.current?.click()`), inclusive no APK.
- Isso elimina uma camada de variação do plugin e mantém UX previsível.
- O upload imediato continua (como já está), mas com estado persistente não há perda visual do modal.

4) Blindar consistência do draft após upload
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Após `doImmediateUpload`:
  - atualizar `form.image_url` e `imagePreview`
  - salvar draft imediatamente na persistência
- Assim, mesmo com remount logo após upload, o modal volta aberto com preview.

5) Observabilidade mínima para confirmar causa e resultado
- Arquivo: `src/components/dashboard/MenuTab.tsx`
- Adicionar logs temporários de ciclo:
  - mount/unmount do MenuTab
  - persist/restore do draft
  - appStateChange active/inactive
- Isso permite validar no próximo teste se houve remount no retorno da galeria.
- Depois da confirmação, limpar logs de debug.

Arquivos impactados
- `src/components/dashboard/MenuTab.tsx` (principal; refatoração de estado + persistência + lifecycle + fluxo de seleção)
- `src/lib/nativeCamera.ts` (opcional: manter sem uso ou descontinuar no fluxo de cardápio)
- Sem mudanças de banco/backend para essa correção.

Critérios de aceite (E2E no APK)
1. Abrir “Novo item”.
2. Tocar “Adicionar foto”.
3. Escolher imagem na galeria.
4. Confirmar:
   - toast de sucesso aparece
   - modal continua aberto
   - preview da imagem permanece visível
   - campos digitados antes da foto continuam preenchidos.
5. Salvar item e validar criação com imagem.
6. Repetir no fluxo de edição de item existente.
7. Teste extra: abrir modal, colocar app em background, voltar — modal deve permanecer conforme draft.

Detalhes técnicos (seção dedicada)
- Problema atacado: volatilidade de `useState` local em cenário de remount causado por lifecycle Android.
- Estratégia: transformar estado transitório crítico (modal + draft de formulário) em estado persistente com reidratação automática.
- Benefício: a UI fica resiliente mesmo quando o SO pausa/retoma Activity/WebView.
- Trade-off: pequeno aumento de complexidade local em `MenuTab`, compensado por estabilidade real no APK.
