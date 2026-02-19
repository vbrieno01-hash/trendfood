
# Corrigir o bug de "precisa recarregar após o login"

## Causa raiz

Existe uma condição de corrida (race condition) no `useAuth.tsx`:

1. Na carga inicial da página, `getSession()` não encontra sessão → `setLoading(false)`
2. O usuário faz login → `navigate("/dashboard")` é chamado imediatamente
3. O `onAuthStateChange` dispara de forma assíncrona e define o `user`, mas despacha `fetchOrganization` via `setTimeout` para evitar deadlock
4. O `DashboardPage` já renderizou com `loading=false`, `user` setado mas `organization=null`
5. O `retryRef` tenta uma correção, mas como o `retryRef.current` é `true` após a primeira tentativa, ele não consegue repetir

O problema é que `loading` nunca volta para `true` quando um novo login acontece, então o dashboard renderiza sem a organização estar carregada.

## Solução

Modificar o `onAuthStateChange` em `useAuth.tsx` para:
- Quando o evento for `SIGNED_IN` (novo login), ativar `loading=true` novamente
- Aguardar a busca da organização completar antes de desativar o `loading`
- Isso garante que o dashboard só renderiza quando a organização já está disponível

## Arquivo afetado

`src/hooks/useAuth.tsx` — ajuste no callback do `onAuthStateChange`

### Mudança

Atualmente o `onAuthStateChange` despacha `fetchOrganization` via `setTimeout` sem controle de loading:

```typescript
// ANTES — sem controle de loading no re-login
(_event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  if (newSession?.user) {
    const userId = newSession.user.id;
    setTimeout(() => {
      if (isMounted.current) fetchOrganization(userId);
    }, 0);
  } else {
    setOrganization(null);
  }
}
```

A correção usa o evento `_event` para identificar quando é um SIGNED_IN novo e ativa o `loading` até a org ser carregada:

```typescript
// DEPOIS — ativa loading durante novo login
(_event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  if (newSession?.user) {
    const userId = newSession.user.id;
    // Se for um novo login (não carga inicial), ativar loading
    if (_event === "SIGNED_IN") {
      setLoading(true);
    }
    setTimeout(() => {
      if (isMounted.current) {
        fetchOrganization(userId).finally(() => {
          if (isMounted.current) setLoading(false);
        });
      }
    }, 0);
  } else {
    setOrganization(null);
    setLoading(false);
  }
}
```

Desta forma, quando o usuário faz login e o dashboard é carregado, ele vê o skeleton de loading corretamente enquanto a organização é buscada, e só renderiza o conteúdo completo quando tudo está pronto — sem precisar recarregar a página.
