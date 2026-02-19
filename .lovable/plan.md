
# Correção do Painel Admin — 3 Problemas Identificados

## Diagnóstico Preciso

### Problema 1 — DashboardPage crasha para o usuário admin (principal)
O usuário admin (`brenojackson30@gmail.com`) não tem nenhuma loja cadastrada. O `DashboardPage.tsx` na linha 180 faz `organization.logo_url` diretamente **sem checar se `organization` é null**. Isso causa um crash instantâneo com `Cannot read properties of null (reading 'logo_url')`.

O fluxo atual:
- Admin faz login → `organization = null` (confirmado pelo banco: nenhuma org com esse user_id)
- `DashboardPage` checa apenas `if (!user)` mas não `if (!organization)`
- Tenta acessar `organization.logo_url` → CRASH

### Problema 2 — Redirecionamento pós-login vai para `/dashboard`
Após login, o usuário é redirecionado para `/dashboard`. O admin sem organização crasha lá. Ele deveria ser redirecionado para `/admin`.

### Problema 3 — Race condition em useAuth
O evento `SIGNED_IN` do `onAuthStateChange` seta `loading = true`, mas o `getSession()` inicial já setou `loading = false`. Se o evento disparar depois de `getSession()`, o `loading` oscila e pode fazer o `isAdmin` ser lido como `false` por um instante, causando redirect desnecessário para `/`.

---

## Solução — 3 correções cirúrgicas

### Correção 1 — DashboardPage: proteger acesso quando organization é null

Adicionar um guard depois do check de `!user`:
```
if (loading || !user) → spinner
if (!organization) → tela de "Configure sua loja" com link para /admin se isAdmin, ou mensagem de "Sua conta está sendo configurada..."
```

Isso evita o crash E dá uma UX melhor.

### Correção 2 — AuthPage: redirecionar admin para /admin após login

No `AuthPage.tsx`, após login bem-sucedido, verificar se o usuário tem role admin e redirecionar para `/admin` em vez de `/dashboard`.

### Correção 3 — useAuth: corrigir race condition no loading

Reorganizar o `useAuth.tsx` para que:
- O `onAuthStateChange` NÃO controle `loading` (apenas atualiza estado)
- Apenas o `getSession()` inicial controle `loading = false`
- Ambos chamem `fetchOrganization` com `setTimeout(0)` para evitar deadlock

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/DashboardPage.tsx` | Guard para `organization === null`: mostrar tela de setup ou link admin |
| `src/pages/AuthPage.tsx` | Após login, checar se admin e redirecionar para `/admin` |
| `src/hooks/useAuth.tsx` | Corrigir race condition: apenas `getSession()` controla `loading` |

---

## Detalhamento Técnico

### DashboardPage.tsx — guard para organization null

Inserir logo após o check `if (loading || !user)`:

```tsx
if (!organization) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-4xl mb-4">🏪</p>
        <h1 className="font-bold text-xl mb-2">Nenhuma loja vinculada</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {isAdmin
            ? "Você está logado como administrador da plataforma."
            : "Sua conta ainda não tem uma loja configurada."}
        </p>
        {isAdmin && (
          <Button asChild>
            <Link to="/admin">Acessar Painel Admin</Link>
          </Button>
        )}
        <Button variant="outline" onClick={signOut} className="ml-2">Sair</Button>
      </div>
    </div>
  );
}
```

### AuthPage.tsx — redirect inteligente pós-login

Após `signIn` bem-sucedido, buscar role e redirecionar:
```tsx
// após login com sucesso:
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", data.user.id)
  .eq("role", "admin")
  .maybeSingle();

if (roleData) {
  navigate("/admin");
} else {
  navigate("/dashboard");
}
```

### useAuth.tsx — corrigir race condition

Remover o `setLoading(true)` do handler `SIGNED_IN` no `onAuthStateChange`. O loading deve ser controlado apenas pelo `getSession()` inicial. O listener apenas atualiza os dados sem resetar loading:

```tsx
// ANTES (problemático):
if (_event === "SIGNED_IN") {
  setLoading(true); // ← REMOVE ISSO
}

// DEPOIS:
// onAuthStateChange apenas atualiza dados, não mexe em loading
```

Isso garante que `isAdmin` nunca oscile para `false` causando redirect errado.
