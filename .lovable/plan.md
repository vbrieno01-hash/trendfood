

## Plano: Substituir Radix Dialog por modal puro React (imune ao Android)

### Diagnóstico real

O problema **não é** nos event handlers (`onInteractOutside`, `onFocusOutside`, etc.). O Radix `Dialog` usa um **Portal** que renderiza o conteúdo fora da árvore DOM do componente. No Android, quando o app vai para background (abrir galeria) e volta, o Radix internamente pode disparar um ciclo de close/re-render no Portal que ignora completamente o `onOpenChange` customizado. Isso é um bug conhecido do Radix Dialog com Capacitor/Android WebViews.

**A única solução definitiva**: remover o Radix Dialog do formulário de criar/editar item e usar um modal puro com `div` + CSS (`fixed inset-0 z-50`), controlado 100% pelo estado React. Sem Portal, sem Radix, sem comportamentos internos.

### Mudanças

**Arquivo: `src/components/dashboard/MenuTab.tsx`**

1. **Remover imports do Dialog Radix:**
   - Remover: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter`

2. **Substituir o bloco `<Dialog>...</Dialog>` por um modal puro:**
   ```text
   {modalOpen && (
     <div className="fixed inset-0 z-50 flex items-center justify-center">
       {/* Backdrop */}
       <div className="absolute inset-0 bg-black/80" />
       {/* Content */}
       <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto
                       bg-background border rounded-lg p-6 mx-4 shadow-lg">
         <h2 className="text-lg font-semibold">
           {editItem ? "Editar item" : "Novo item do cardápio"}
         </h2>
         <form onSubmit={handleSubmit} className="space-y-4 mt-4">
           {/* ... todo o conteúdo do formulário permanece igual ... */}
           <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
             <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
               Cancelar
             </Button>
             <Button type="submit" disabled={isPending} className="gap-2">
               {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
               {editItem ? "Salvar alterações" : "Adicionar item"}
             </Button>
           </div>
         </form>
       </div>
     </div>
   )}
   ```

3. **Nenhuma mudança** no fluxo de upload, `handleNativePhoto`, `doImmediateUpload`, `handleSubmit`, ou `useMenuItems`.

4. **Manter AlertDialog** (delete confirmation) como está, pois não é afetado pelo problema.

### Por que isso resolve definitivamente

- `{modalOpen && (...)}` é um render condicional React puro. Nenhum código externo pode mudar `modalOpen` para `false`.
- Sem Portal do Radix = sem comportamentos internos de close.
- Sem `onOpenChange`, `onInteractOutside`, `onFocusOutside` = nada para "furar".
- O Android pode pausar/resumir o WebView à vontade; o estado React `modalOpen` permanece `true` até o usuário clicar Cancelar ou Salvar.

### Detalhes técnicos

O Radix Dialog usa internamente:
- `DialogPortal` que renderiza em `document.body`
- `DismissableLayer` com `FocusScope` que monitora foco
- `Presence` animation system que pode disparar unmount

No Android/Capacitor, ao abrir a galeria nativa:
1. A Activity pausa → WebView perde foco
2. Radix `DismissableLayer` detecta perda de foco
3. Mesmo com `preventDefault`, o `Presence` pode trigger unmount interno
4. O Portal é removido do DOM independentemente do `onOpenChange`

Com div pura, nada disso acontece. O React simplesmente mantém o `div` no DOM enquanto `modalOpen === true`.

