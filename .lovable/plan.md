

## Plano: Corrigir botão flutuante do WhatsApp não abrindo em alguns dispositivos

### Problema
O `window.open()` dentro do `openWhatsAppWithFallback` é bloqueado por alguns navegadores móveis, mesmo sendo disparado por clique direto. O toast de fallback aparece, mas o usuário não percebe. Resultado: parece que nada aconteceu.

### Solução
Trocar o `<button>` + `openWhatsAppWithFallback` por um `<a href="..." target="_blank">` nativo. Links `<a>` com `target="_blank"` nunca são bloqueados por popup blockers — o navegador trata como navegação normal. Isso é mais confiável que `window.open()` para links de contato como `wa.me`.

### Mudança

**Arquivo: `src/pages/UnitPage.tsx`**

Substituir o `<button onClick={...}>` do FAB (linhas 1337-1349) por:

```tsx
<a
  href={`https://wa.me/55${org.whatsapp}?text=${encodeURIComponent("Olá! Gostaria de tirar uma dúvida sobre a loja. Pode me ajudar?")}`}
  target="_blank"
  rel="noopener noreferrer"
  className="fixed bottom-5 left-5 z-40 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
  style={{ backgroundColor: "#25D366" }}
  aria-label="Falar com a loja pelo WhatsApp"
>
  <svg ...> <!-- mesmo SVG --> </svg>
</a>
```

### Resultado
O botão abre o WhatsApp de forma nativa em qualquer dispositivo, sem depender de `window.open()` nem de toast de fallback.

### Arquivo modificado
| Arquivo | Mudança |
|---------|---------|
| `src/pages/UnitPage.tsx` | Trocar `<button>` por `<a target="_blank">` no FAB do WhatsApp |

