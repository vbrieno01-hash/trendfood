

## Correção: Tela branca em alguns aparelhos ao fazer pedido

### Problema

Quando o cliente acessa o cardápio online (`/unidade/:slug`) e tenta finalizar o pedido, alguns dispositivos mostram tela branca. Isso acontece porque erros JavaScript não tratados "matam" o React, e sem um Error Boundary, a tela fica completamente em branco.

### Causas identificadas

1. **`handlePixSuccess`** usa `import()` dinâmico para importar o Supabase client -- navegadores antigos (especialmente WebView do Instagram/Facebook) não suportam isso e lançam erro
2. **`handleSendWhatsApp`** não tem `try/catch` -- se `window.open` for bloqueado ou o `placeOrder.mutate` lançar exceção síncrona, o React morre
3. **`navigator.clipboard.writeText`** no `PixPaymentScreen` falha em conexões HTTP ou navegadores que não suportam -- erro não tratado
4. **Não existe Error Boundary** -- qualquer promise rejeitada sem tratamento = tela branca permanente

### Correções planejadas

#### 1. `src/pages/UnitPage.tsx`
- Remover o `import()` dinâmico de `handlePixSuccess` e usar o `supabase` já importado no topo do arquivo
- Envolver `handleSendWhatsApp` em `try/catch` com toast de erro
- Envolver `handlePixSuccess` em `try/catch`

#### 2. `src/components/checkout/PixPaymentScreen.tsx`
- Envolver `navigator.clipboard.writeText` em `try/catch` com fallback

#### 3. `src/components/ErrorBoundary.tsx` (novo)
- Criar um Error Boundary global que mostra uma mensagem amigável em vez de tela branca
- Botão "Tentar novamente" que recarrega a página

#### 4. `src/App.tsx`
- Envolver as rotas com o Error Boundary
- Adicionar listener global `unhandledrejection` para capturar promises rejeitadas

---

### Detalhes técnicos

**UnitPage.tsx -- handlePixSuccess corrigido (sem import dinâmico):**
```typescript
const handlePixSuccess = (orderId: string, paid: boolean) => {
  try {
    setShowPixScreen(false);
    setPixOrderId(null);

    if (paid) {
      // Usa o supabase já importado no topo -- sem import() dinâmico
      supabase.from("orders").update({ paid: true, status: "pending" }).eq("id", orderId);
    }

    // Send WhatsApp...
  } catch (err) {
    console.error("[UnitPage] handlePixSuccess error:", err);
  }
  resetCheckout();
};
```

**UnitPage.tsx -- handleSendWhatsApp com try/catch:**
```typescript
const handleSendWhatsApp = (overridePayment?: string, overrideOrderId?: string) => {
  try {
    // ... validação e lógica existente ...
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    console.error("[UnitPage] WhatsApp error:", err);
    // fallback: tenta abrir link diretamente
    try { window.location.href = url; } catch {}
  }
};
```

**PixPaymentScreen.tsx -- clipboard com fallback:**
```typescript
const handleCopy = useCallback(() => {
  if (!pixCopiaECola) return;
  try {
    navigator.clipboard.writeText(pixCopiaECola).then(() => {
      setCopied(true);
      toast({ title: "Codigo PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback para navegadores sem clipboard API
      const ta = document.createElement("textarea");
      ta.value = pixCopiaECola;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      toast({ title: "Codigo PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    });
  } catch {
    toast({ title: "Toque e segure o codigo para copiar", variant: "destructive" });
  }
}, [pixCopiaECola, toast]);
```

**ErrorBoundary.tsx (novo componente):**
```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div> /* tela amigável com botão "Tentar novamente" */ </div>
      );
    }
    return this.props.children;
  }
}
```

**App.tsx -- listener global + Error Boundary:**
```typescript
// Dentro do App, antes das Routes:
useEffect(() => {
  const handler = (e: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", e.reason);
    e.preventDefault();
  };
  window.addEventListener("unhandledrejection", handler);
  return () => window.removeEventListener("unhandledrejection", handler);
}, []);
```

### Resultado esperado

- Nenhum dispositivo vai mais mostrar tela branca -- erros sao capturados e mostram feedback amigavel
- O fluxo de compra funciona em navegadores antigos (WebView do Instagram, Facebook, etc.)
- Se algo falhar, o cliente ve um botao "Tentar novamente" em vez de tela branca

