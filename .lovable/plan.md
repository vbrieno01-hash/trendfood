

## Corrigir WhatsApp bloqueado após integração do Push

### Diagnóstico
O pedido **está sendo salvo no banco** corretamente (verificado: pedidos reais continuam chegando). O problema é que a mensagem do WhatsApp **não está abrindo automaticamente** — o browser bloqueia o `window.open` porque o contexto de "gesto do usuário" se perde.

**Causa raiz**: Na linha 602-603 do `UnitPage.tsx`, após o `placeOrder` retornar com sucesso (callback assíncrono), o código chama `registerForOrder(order.id)` que internamente faz `Notification.requestPermission()` (outro popup assíncrono). Quando o `openWhatsAppWithFallback` roda logo em seguida, o browser já não considera mais como ação direta do usuário e **bloqueia o popup do WhatsApp**.

Antes da integração do push, o `openWhatsAppWithFallback` era a primeira coisa chamada no `onSuccess`, e o gesto do usuário ainda era válido.

### Solução
Inverter a ordem: **abrir o WhatsApp PRIMEIRO** (enquanto o gesto do usuário ainda é válido), e só depois registrar o push de forma silenciosa (fire-and-forget).

### Alteração

**Arquivo: `src/pages/UnitPage.tsx`**

No callback `onSuccess` do `placeOrder.mutate` (fluxo WhatsApp, ~linha 600-603):

```typescript
// ANTES (quebra o popup):
onSuccess: (order) => {
  registerForOrder(order.id);          // ← pede permissão push (perde gesto)
  openWhatsAppWithFallback(whatsappUrl); // ← bloqueado pelo browser
  ...
}

// DEPOIS (funciona):
onSuccess: (order) => {
  openWhatsAppWithFallback(whatsappUrl); // ← abre WhatsApp primeiro (gesto válido)
  registerForOrder(order.id);            // ← push silencioso depois
  ...
}
```

Mesma inversão no fluxo PIX (~linha 502-506) — mover `registerForOrder` para depois do `setShowPixScreen`.

### Arquivos alterados
- `src/pages/UnitPage.tsx` — inverter ordem de 2 linhas em 2 lugares

