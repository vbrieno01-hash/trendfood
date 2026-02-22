

# Corrigir App Travado nos Skeletons Apos Instalacao PWA

## Problema
Apos instalar o app como PWA, a tela fica travada nos skeletons de carregamento. O motivo e que o refresh token da sessao ficou invalido ("Refresh Token Not Found") e o estado `loading` nunca e definido como `false`, impedindo o redirecionamento para a tela de login.

## Causa raiz
No `useAuth.tsx`, o `onAuthStateChange` pode disparar antes do `getSession`, e quando o refresh token e invalido, o fluxo entre os dois callbacks pode deixar `loading` travado como `true`. O `onAuthStateChange` seta `setLoading(true)` no `SIGNED_IN` mas se o token e invalido, o evento pode nao disparar, e o `getSession` pode retornar `null` enquanto o `onAuthStateChange` ainda esta processando.

## Solucao
Adicionar um timeout de seguranca (safety timeout) no `useAuth.tsx`: se apos 5 segundos o `loading` ainda estiver `true`, forcar `setLoading(false)`. Isso garante que o app nunca fique travado nos skeletons indefinidamente.

Alem disso, garantir que no `onAuthStateChange`, quando o evento for `SIGNED_OUT` ou `TOKEN_REFRESHED` com falha, o `loading` seja explicitamente definido como `false`.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useAuth.tsx` | Adicionar safety timeout de 5s para forcar `setLoading(false)`. Garantir que `setLoading(false)` e chamado no bloco `else` do `onAuthStateChange` (quando `newSession` e null). |

## Detalhes tecnicos

### Safety timeout
```typescript
// Dentro do useEffect principal, apos getSession:
const safetyTimeout = setTimeout(() => {
  if (isMounted.current && loading) {
    setLoading(false);
  }
}, 5000);

// No cleanup:
return () => {
  isMounted.current = false;
  subscription.unsubscribe();
  clearTimeout(safetyTimeout);
};
```

### onAuthStateChange - bloco else
```typescript
} else {
  setOrganizations([]);
  setActiveOrgId(null);
  setIsAdmin(false);
  setLoading(false); // <-- adicionar esta linha
}
```

Isso garante que quando nao ha sessao valida (refresh token invalido), o loading termina e o usuario e redirecionado para a tela de login automaticamente.

