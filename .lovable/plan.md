
# Diagnóstico e Correção: Performance Crítica de Auth e Dashboard

## Problemas Identificados

### Problema 1 — Duplo disparo no `useAuth.tsx` (causa do carregamento infinito)

O código atual tem uma **race condition severa** entre `onAuthStateChange` e `getSession()`. Ambos rodam quase ao mesmo tempo ao montar o componente:

```
onAuthStateChange dispara → await fetchOrganization() [bloqueia o callback] 
getSession() resolve     → fetchOrganization() novamente
```

A especificação do Supabase é clara: **nunca use `await` dentro do callback de `onAuthStateChange`**, pois isso cria um deadlock no lock de autenticação interno, causando exatamente o carregamento infinito relatado. Quando o callback fica bloqueado por um `await`, o Supabase não consegue resolver o estado da sessão, gerando o loop.

### Problema 2 — `QueryClient` sem configuração de timeout/retry

O `QueryClient` em `App.tsx` é criado sem nenhuma configuração. Isso significa que em caso de falha de rede, ele vai fazer 3 retries automáticos com backoff exponencial — podendo travar o dashboard por até 30+ segundos antes de mostrar um erro.

### Problema 3 — RLS com `Permissive: No` (RESTRICTIVE)

Olhando a configuração atual do banco, todas as policies estão como `Permissive: No`, que significa `RESTRICTIVE`. Policies RESTRICTIVE são aplicadas com operador AND — ou seja, o usuário precisa passar em TODAS as policies restritivas simultaneamente. O comportamento correto para multi-tenant é `PERMISSIVE` (OR). Isso pode estar causando bloqueios silenciosos de leitura/escrita.

### Problema 4 — Redirecionamento lento pós-login

Em `DashboardPage.tsx`, o redirecionamento para `/auth` acontece via `navigate()` dentro do render (sem `useEffect`), o que é um anti-pattern no React 18 e causa renders extras.

---

## Solução Técnica

### Mudança 1 — `useAuth.tsx` (crítica)

Refatorar completamente a lógica de auth para seguir o padrão correto:

- `onAuthStateChange` → apenas atualiza `session` e `user` com `setState` síncrono. **Sem awaits.** Para buscar a organização, usa `setTimeout(..., 0)` para despachar fora do lock.
- `getSession()` → responsável pelo carregamento inicial. Busca sessão + organização e então define `loading = false`.
- Flag `isMounted` para evitar setState em componente desmontado.

```
Antes (bugado):
onAuthStateChange → await fetchOrganization() → DEADLOCK

Depois (correto):
onAuthStateChange → setState sincrono → setTimeout → fetchOrganization (fora do lock)
getSession        → await fetchOrganization → setLoading(false)
```

### Mudança 2 — `App.tsx` — QueryClient com retry e timeout configurados

Configurar o `QueryClient` com:
- `retry: 1` (apenas 1 retry em vez de 3)
- `staleTime: 30000` (30s de cache)
- `networkMode: 'always'`

### Mudança 3 — `DashboardPage.tsx` — Redirecionamento com `useEffect`

Mover o `navigate("/auth")` para dentro de um `useEffect` para evitar side-effects durante o render.

### Mudança 4 — Banco: Corrigir policies RLS para PERMISSIVE

Recriar todas as policies de `RESTRICTIVE` para `PERMISSIVE` via migration SQL. Isso garante que as operações de leitura e escrita não sejam silenciosamente bloqueadas pelo operador AND das policies restritivas.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.tsx` | Refatorar auth para eliminar deadlock no `onAuthStateChange` |
| `src/App.tsx` | Configurar `QueryClient` com retry=1 e staleTime |
| `src/pages/DashboardPage.tsx` | Mover redirect para `useEffect`, melhorar timeout/fallback |
| `supabase/migrations/` | Recriar policies RLS como PERMISSIVE |

## Resultado Esperado

| Situação | Antes | Depois |
|---|---|---|
| Login e ir para dashboard | 3-8 segundos ou infinito | Menos de 1 segundo |
| Carregamento infinito | Frequente | Eliminado |
| Erro de RLS silencioso | Possível | Corrigido |
| Retry em falha de rede | 3x com 30s de espera | 1x com 5s |
