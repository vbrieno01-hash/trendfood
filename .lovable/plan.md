
# Diagnóstico Completo e Plano de Correção

## O que foi descoberto

Testei o fluxo de cadastro end-to-end e confirmei:

**O banco de dados está funcionando.** A organização "Burguer Teste" foi criada com sucesso no banco. As políticas RLS foram recriadas como PERMISSIVE e estão corretas.

**O problema é uma race condition no AuthProvider.** Aqui está a sequência exata do que acontece:

```
1. supabase.auth.signUp() → cria usuário → dispara onAuthStateChange IMEDIATAMENTE
2. onAuthStateChange → fetchOrganization(userId) → org ainda não existe → organization = null
3. código continua → INSERT profiles → INSERT organizations (sucesso!)
4. navigate("/dashboard") → DashboardPage renderiza
5. DashboardPage vê organization = null → mostra "Nenhuma lanchonete encontrada" ❌
```

O Supabase Auth dispara o evento `onAuthStateChange` ANTES do código inserir a organização no banco. Quando o dashboard carrega, o contexto ainda tem `organization = null`.

## Solução — 3 mudanças cirúrgicas

### 1. `AuthPage.tsx` — Aguardar org antes de navegar

Após o INSERT da organização, chamar `refreshOrganization()` do contexto antes de navegar. Isso garante que o contexto tenha os dados corretos quando o dashboard carregar.

Ou alternativamente (mais robusto): desabilitar o `onAuthStateChange` de disparar `fetchOrganization` durante o signup, e deixar o `navigate` acontecer só depois que o INSERT concluir e o contexto for atualizado.

A abordagem mais limpa: no `handleSignup`, após todos os INSERTs, **chamar `refreshOrganization()` explicitamente** antes de navegar. Isso funciona porque `refreshOrganization` usa o `user` já setado pelo `onAuthStateChange`.

Mas há um problema de timing: `refreshOrganization` usa `user` do estado, que pode não estar setado ainda. A solução mais confiável é passar o `userId` diretamente.

**Abordagem final escolhida:**
- Expor `fetchOrganization` (ou uma versão com userId explícito) no contexto como `refreshOrganizationForUser(userId)`
- Ou simplesmente: no `AuthPage.handleSignup`, após o INSERT bem-sucedido, aguardar um pequeno retry loop até o `organization` aparecer

**Na prática, a solução mais simples e robusta:**
- No `AuthPage.handleSignup`, após inserir a organização com sucesso, chamar diretamente `refreshOrganization()` — mas expondo uma versão que aceita userId
- Alternativamente: usar `supabase.from("organizations").select(...).eq("user_id", userId)` diretamente no AuthPage antes de navegar, para popular o contexto

**Solução escolhida (mais limpa):** Adicionar `setOrganizationFromSignup` ao AuthContext que recebe o userId e busca a org, ou simplesmente expor `fetchOrganizationById` que recebe um userId.

### 2. `DashboardPage.tsx` — Retry de organização

Adicionar um `useEffect` que tenta fazer `refreshOrganization()` quando `user` existe mas `organization` é null. Isso funciona como fallback para o caso da race condition.

### 3. `useAuth.tsx` — Expor refreshOrganizationForUser

Expor uma função que aceita um userId explícito para ser chamada no momento certo do signup.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useAuth.tsx` | Expor `refreshOrganizationForUser(userId: string)` no contexto |
| `src/pages/AuthPage.tsx` | Chamar `refreshOrganizationForUser(userId)` após INSERTs, antes de `navigate` |
| `src/pages/DashboardPage.tsx` | Adicionar fallback: se `user` existe e `organization` é null, tenta `refreshOrganization()` automaticamente com retry |

## Resultado esperado após a correção

```
1. supabase.auth.signUp() → cria usuário → dispara onAuthStateChange
2. onAuthStateChange → fetchOrganization(userId) → null (org ainda não existe)
3. INSERT profiles → INSERT organizations → SUCESSO
4. refreshOrganizationForUser(userId) → busca org recém-criada → organization = { id, name, slug, ... }
5. navigate("/dashboard") → DashboardPage renderiza com organization preenchida ✅
```

O fallback no DashboardPage garante que mesmo se houver qualquer timing issue, o painel tentará recarregar a organização automaticamente.

## Mudanças no banco de dados

Nenhuma. O banco está correto — todas as tabelas, colunas, RLS e a função `increment_vote` estão funcionando.
