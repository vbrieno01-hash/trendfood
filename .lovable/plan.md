

## Auditoria completa: Páginas do cliente (UnitPage + TableOrderPage)

Revisei linha por linha os dois fluxos de pedido. Aqui está o que encontrei:

---

### Problemas encontrados

**1. ItemDetailDrawer: fechar com swipe não remove history state**
O `ItemDetailDrawer` usa `Drawer` do Vaul com `onClose`, mas o `onClose` do Drawer é chamado quando o usuário faz swipe-down para fechar. Porém no `UnitPage`, o `onClose` chama `popDrawerState()` que faz `window.history.back()`. Isso está correto. Sem bug aqui.

**2. Drawer de checkout: fechar via overlay não limpa `showPixScreen`**
Se o usuário está na tela de PIX dentro do Drawer e fecha o Drawer pelo overlay (clicando fora), o `onOpenChange` seta `checkoutOpen = false` mas **não reseta** `showPixScreen` e `pixOrderId`. Na próxima vez que abrir o checkout, pode mostrar a tela de PIX antiga. O `popstate` handler (linha 108-111) faz esse reset, mas o clique no overlay não passa pelo popstate.

**3. PIX cancel no checkout não cancela o pedido no banco**
Quando o usuário cancela o PIX (`onCancel` no `PixPaymentScreen`), o pedido fica com status `awaiting_payment` para sempre no banco. Não há cleanup. Isso pode acumular pedidos fantasma. (Mitigado pelo `cleanup-phantom-orders` edge function, mas é um ponto de atenção.)

**4. `pix_confirmation_mode` pode ser `undefined` no `PixPaymentScreen`**
Na linha 1251, `org.pix_confirmation_mode` é passado diretamente. Se for `undefined`, o componente trata como `!== "automatic"` e vai para um estado sem QR nem fallback, mostrando "PIX não configurado". Funciona, mas a UX pode confundir.

**5. Troco: valor 0 no CurrencyInput pode causar confusão**
Se o usuário digita um valor no campo "Outro valor" do troco e depois clica "Não precisa", o `changeFor` vai para 0, mas o CurrencyInput ainda mostra "R$ 0,00". Isso é cosmético, não um bug.

**6. `addToCartWithQty` substitui em vez de somar**
Quando o usuário abre o ItemDetailDrawer e adiciona um item que já está no carrinho (mesma combo de addons), ele **substitui** a quantidade em vez de somar. Isso é intencional pelo design (o drawer mostra qty=1 por padrão), mas pode surpreender o usuário.

---

### O que está BEM implementado (sem bugs)

- **Persistência do carrinho no localStorage** - swipe-back não perde itens
- **History state management** - popstate fecha drawers em vez de navegar para fora
- **WhatsApp fallback** - nunca redireciona fora da página, usa `window.open` com toast de fallback
- **Validação de formulário** - scroll automático para primeiro campo com erro
- **Double-submit protection** - `isSubmitting` flag + `placeOrder.isPending` check
- **Loja fechada** - bloqueio visual correto em todos os pontos
- **Erro de DB** - carrinho mantido, toast informativo, sem perda de dados
- **Frete por bairro** - cálculo correto, "Sob consulta" para bairro desconhecido

---

### Correção recomendada

O único bug real que pode causar comportamento estranho visível ao usuário:

**Arquivo**: `src/pages/UnitPage.tsx`
**Problema**: Fechar o Drawer de checkout pelo overlay (sem popstate) não reseta `showPixScreen`/`pixOrderId`.
**Fix**: No `onOpenChange` do Drawer (linha 907), adicionar reset do estado PIX:

```tsx
onOpenChange={(open) => {
  if (!open) {
    popDrawerState();
    setCheckoutOpen(false);
    setShowPixScreen(false);
    setPixOrderId(null);
  }
}}
```

Essa é uma correção simples de 2 linhas que evita que a tela de PIX reapareça incorretamente ao reabrir o checkout.

---

### Veredicto

A página do cliente está sólida. O único problema real é o estado do PIX não sendo limpo ao fechar o drawer pelo overlay. Todos os outros cenários (voltar, fechar, erro de rede, popup bloqueado) estão cobertos.

