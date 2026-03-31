

## Plano: Corrigir fluxo Google OAuth — redirect e "preso no onboarding"

### Problemas identificados

1. **Redirect para página inicial**: O `redirect_uri` está como `window.location.origin` (raiz `/`), então após o Google autenticar, o usuário volta para `/` (landing page) em vez de `/auth`. O `useEffect` que detecta `user && !organization` só existe no `AuthPage`, não na landing.

2. **Preso no "Complete seu cadastro"**: O estado `googleOnboarding` é local e nunca reseta. Não há botão "Voltar" nem mecanismo para fazer signOut e trocar de conta. Uma vez que `user && !organization` é true, o formulário fica travado.

3. **Não consegue trocar de email**: Sem signOut, a sessão Google persiste e o estado de onboarding não limpa.

### Correções

**Arquivo: `src/pages/AuthPage.tsx`** — 3 alterações:

**1) Mudar `redirect_uri` para apontar para `/auth`:**
```typescript
await lovable.auth.signInWithOAuth("google", {
  redirect_uri: `${window.location.origin}/auth`,
});
```
Isso faz o callback do Google retornar para `/auth`, onde o `useEffect` pode capturar a sessão e redirecionar ou mostrar onboarding.

**2) Vincular `googleOnboarding` ao `user.id`** — resetar quando user muda ou desloga:
```typescript
useEffect(() => {
  if (authLoading) return;
  if (!user) {
    setGoogleOnboarding(false);
    return;
  }
  if (organization) {
    navigate(fullRedirect, { replace: true });
    return;
  }
  // user exists, no org → onboarding
  setGoogleOnboarding(true);
}, [user?.id, organization?.id, authLoading]);
```

**3) Adicionar botão "Usar outro email" no formulário de onboarding Google:**
```typescript
const handleBackToAuth = async () => {
  await supabase.auth.signOut();
  setGoogleOnboarding(false);
};
```
E no JSX do formulário de onboarding, após o botão "Criar lanchonete":
```tsx
<Button type="button" variant="ghost" className="w-full" onClick={handleBackToAuth}>
  Usar outro e-mail
</Button>
```

### Arquivos alterados
- `src/pages/AuthPage.tsx`

