

## Plano: Corrigir Google Login — redirecionar após autenticação

### Problema
O login com Google funciona no backend (os logs confirmam login bem-sucedido via OIDC). Porém, o `AuthPage` **não tem nenhum `useEffect`** que observe o estado de autenticação. Após o OAuth completar e o `useAuth` detectar o `SIGNED_IN`, a página simplesmente não reage — o usuário fica preso na tela de login.

Para login com email/senha, o redirect é feito manualmente após `signInWithPassword`. Mas no fluxo Google OAuth, o redirect acontece externamente (Google → callback → `setSession`), e quando a página recarrega, ninguém faz o `navigate()`.

Além disso, para **novos usuários Google** (sem organização), não há criação automática de organização — o usuário cairia no dashboard vazio.

### Correção

**Arquivo: `src/pages/AuthPage.tsx`** — 2 alterações:

**1) Adicionar `useEffect` para redirecionar quando `user` já está autenticado:**

```typescript
import { useState, useEffect } from "react";
// ...
const { user, organization, loading, refreshOrganizationForUser } = useAuth();

useEffect(() => {
  if (loading) return;
  if (user && organization) {
    navigate(fullRedirect, { replace: true });
  }
}, [user, organization, loading]);
```

Isso cobre:
- Usuário Google existente (tem org) → redireciona ao dashboard
- Página recarregada com sessão ativa → redireciona imediatamente

**2) Para novos usuários Google (sem organização):**

Quando `user` existe mas `organization` é null, exibir um formulário simplificado pedindo apenas nome da lanchonete e WhatsApp (os dados que faltam), e então criar a organização. Isso garante que novos usuários via Google também completem o onboarding.

### Arquivos alterados
- `src/pages/AuthPage.tsx` (adicionar useEffect de redirect + formulário de onboarding Google)

