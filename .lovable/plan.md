

## Plano: Corrigir links "Termos de Uso" em todas as páginas

### Problema
Há 3 locais com links para os Termos de Uso, e um deles não funciona:

1. **`src/pages/Index.tsx`** (footer) — `<Link to="/termos">` ✅ funciona
2. **`src/pages/AuthPage.tsx`** (rodapé do form) — `<span>` sem link ❌ não abre nada
3. **`src/components/checkout/TermsCheckbox.tsx`** (checkout) — abre Dialog inline ✅ funciona
4. **`src/pages/TermsPage.tsx`** — página `/termos` ✅ existe e renderiza

### Correções

**1) `src/pages/AuthPage.tsx`** — trocar o `<span>` por um `<Link to="/termos">`:
```tsx
<p className="text-center text-xs text-muted-foreground mt-8">
  Ao criar sua conta, você concorda com nossos{" "}
  <Link to="/termos" target="_blank" className="underline hover:text-foreground transition-colors">
    Termos de Uso
  </Link>.
</p>
```

Isso é a única correção necessária. Os outros pontos já funcionam (Index usa `<Link to="/termos">`, TermsCheckbox abre Dialog).

### Arquivos alterados
- `src/pages/AuthPage.tsx` (1 trecho — linha ~728-731)

