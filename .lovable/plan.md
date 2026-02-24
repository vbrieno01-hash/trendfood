

## Correção definitiva: modal fecha SOMENTE pelos botões

### Problema atual
Mesmo com `onInteractOutside`, `onPointerDownOutside`, `onFocusOutside` e o guard `nativePickerInFlightRef`, o Dialog do Radix ainda consegue fechar no APK. O Android tem comportamentos de lifecycle (Activity pause/resume, foco do WebView) que disparam fechamento por caminhos internos do Radix que não são capturáveis apenas com event handlers.

### Solução
Blindar o modal **completamente**: remover o botão X do DialogContent, bloquear Escape sempre, e tornar `onOpenChange` totalmente controlado (nunca aceitar `false` vindo do Radix — só fechar via `setModalOpen(false)` explícito nos botões Cancelar e Salvar).

### Mudanças em `src/components/dashboard/MenuTab.tsx`

**1) `onOpenChange` ignora qualquer tentativa de fechar:**
```text
<Dialog open={modalOpen} onOpenChange={(next) => {
  if (next) setModalOpen(true);
  // Nunca aceita false — fechamento só via botões
}}>
```

**2) DialogContent bloqueia tudo + esconde o X:**
```text
<DialogContent
  className="max-w-md max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
  onFocusOutside={(e) => e.preventDefault()}
  onEscapeKeyDown={(e) => e.preventDefault()}
>
```
- `[&>button.absolute]:hidden` esconde o botão X nativo do Radix DialogContent via CSS
- `onEscapeKeyDown` agora bloqueia sempre (não só durante picker)

**3) Remover `nativePickerInFlightRef`** — não é mais necessário, pois o modal nunca fecha automaticamente.

**4) Manter os dois pontos de fechamento explícito:**
- Botão "Cancelar": `onClick={() => setModalOpen(false)}`
- Após submit bem-sucedido: `setModalOpen(false)` dentro de `handleSubmit`

### Por que isso funciona
Ao ignorar completamente o `onOpenChange(false)` do Radix, nenhum evento do Android (focus loss, activity pause, resume) consegue fechar o modal. O único caminho é o código explícito nos botões.

