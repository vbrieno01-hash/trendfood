

# Correção: Preservar parâmetro `plan` após login/cadastro

## Problema
O `AuthPage.tsx` recebe `?redirect=/planos&plan=pro` na URL, mas:
1. O `handleSignup` redireciona fixo para `/dashboard` (ignora o `redirectTo`)
2. O parâmetro `plan` não é repassado na URL de redirecionamento

## Alterações: `src/pages/AuthPage.tsx`

### 1. Construir URL completa com o parâmetro `plan` (após linha 40)
```typescript
const planParam = searchParams.get("plan");
const fullRedirect = planParam && redirectTo.includes("/planos")
  ? `${redirectTo}?plan=${planParam}`
  : redirectTo;
```

### 2. Corrigir signup (linha ~128)
Trocar `navigate("/dashboard", { replace: true })` por `navigate(fullRedirect, { replace: true })`

### 3. Corrigir login (linhas ~157-162)
Trocar todas as referências a `redirectTo` por `fullRedirect` nos `navigate()`

