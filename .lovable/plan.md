

## Diagnóstico: Cliente online "volta pro começo" ao finalizar pedido

### Causa raiz

O problema está em `src/lib/whatsappRedirect.ts` (linha 46-49). Quando `window.open` falha (popup bloqueado — comum em navegadores mobile), o fallback usa **`window.location.href`** para redirecionar a página inteira para a URL do WhatsApp. Isso:

1. **Navega a página inteira para fora** — o SPA perde todo o estado
2. Quando o cliente volta (botão voltar ou troca de app), o carrinho está vazio, o checkout resetado
3. Pior: como `openWhatsAppWithFallback` é chamado **antes** de `placeOrder.mutate`, o pedido **nem chega a ser salvo no banco**

Esse bug só ocorre em produção (`trendfood.lovable.app`) porque no preview do Lovable a página está dentro de um iframe (`isEmbeddedOrRestrictedContext() = true`), fazendo o código pular o `location.href`.

### Correções (2 arquivos)

**1. `src/lib/whatsappRedirect.ts`** — Remover o fallback `location.href` completamente. Manter apenas `window.open` + toast manual:

```typescript
export function openWhatsAppWithFallback(url: string, options: OpenWhatsAppOptions = {}): void {
  // Step 1: try window.open
  let opened = false;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) opened = true;
  } catch { }

  if (opened) return;

  // Step 2: toast com link manual (NUNCA navegar a página atual)
  toast.info("Toque no botão abaixo para abrir o WhatsApp.", {
    action: {
      label: "Abrir WhatsApp",
      onClick: () => { window.open(url, "_blank"); },
    },
    duration: 30000,
  });
}
```

**2. `src/pages/UnitPage.tsx`** — Inverter a ordem: salvar pedido no banco **primeiro**, abrir WhatsApp apenas no `onSuccess`:

No fluxo não-PIX (linhas ~410-464), a lógica atual é:
```
openWhatsAppWithFallback(url)  ← abre WhatsApp (pode navegar fora)
placeOrder.mutate(...)          ← salva no banco (pode nem executar)
```

Será invertido para:
```
placeOrder.mutate(...)
  onSuccess: () => {
    openWhatsAppWithFallback(url)  ← só abre após salvar
    resetCheckout()
  }
```

Isso garante que mesmo se o popup for bloqueado, o pedido já está salvo e o cliente vê o toast com link manual sem perder o estado.

### Impacto

- **Todos os clientes online** (atuais e futuros) se beneficiam
- Pedidos nunca mais serão perdidos por navegação acidental
- O carrinho só é limpo após confirmação de salvamento no banco
- Funciona em qualquer navegador mobile (Chrome, Safari, in-app browsers)

