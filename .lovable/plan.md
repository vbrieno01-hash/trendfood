
# Corrigir Race Condition no Login Admin

## Problema

Quando `brenojackson30@gmail.com` faz login, acontece esta sequencia:

1. `onAuthStateChange` dispara com evento SIGNED_IN
2. `user` e `session` sao atualizados imediatamente (sincrono)
3. `loading` ja esta `false` (foi definido no carregamento inicial)
4. `fetchOrganization` roda no `setTimeout` (asssincrono, ainda nao completou)
5. `AdminPage` renderiza: ve `user` presente, `isAdmin = false`, redireciona para `/`
6. `fetchOrganization` completa e define `isAdmin = true` -- mas ja e tarde demais

## Solucao

No `onAuthStateChange`, quando o evento for `SIGNED_IN`, definir `loading = true` ANTES de chamar `fetchOrganization`. Isso faz o `AdminPage` mostrar o spinner em vez de redirecionar prematuramente. Depois que `fetchOrganization` terminar, `loading` volta para `false`.

## Detalhes tecnicos

### Arquivo: `src/hooks/useAuth.tsx`

Alterar o callback do `onAuthStateChange`:

```text
// ANTES (problematico):
setTimeout(() => {
  if (isMounted.current) {
    fetchOrganization(userId);
  }
}, 0);

// DEPOIS (corrigido):
if (_event === "SIGNED_IN") {
  setLoading(true);
}
setTimeout(async () => {
  if (isMounted.current) {
    await fetchOrganization(userId);
    if (isMounted.current) setLoading(false);
  }
}, 0);
```

Isso garante que durante o intervalo entre o login e a conclusao da busca de roles, o `AdminPage` mostra o spinner de carregamento em vez de redirecionar para a pagina inicial.

### Nenhuma outra mudanca necessaria
- `AdminPage.tsx` ja trata `loading` corretamente (mostra spinner)
- Banco de dados ja esta correto (breno tem role admin)
