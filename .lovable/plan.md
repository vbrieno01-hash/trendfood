

## Diagnóstico

O problema acontece quando o cadastro falha **depois** que o usuário auth já foi criado. O fluxo atual é:

1. `supabase.auth.signUp()` → cria o usuário no auth (sucesso)
2. Insere `organizations` com `referred_by_id` → **falha** (ex: slug duplicado, timeout, etc.)
3. Usuário tenta de novo → `signUp` retorna **422: "User already registered"**
4. Usuário fica preso: não consegue criar conta de novo, e a organização com a indicação nunca foi criada

Os logs de auth confirmam: `user_repeated_signup` com status 422.

## Solução

**Arquivo: `src/pages/AuthPage.tsx`** — Tratar o caso "User already registered" no `handleSignup`:

1. Quando `signUp` retornar erro "User already registered", fazer `signInWithPassword` automaticamente
2. Após login, verificar se o usuário já tem uma organização
3. Se não tiver, criar a organização (com `referred_by_id` preservado)
4. Se já tiver, redirecionar normalmente para o dashboard

Isso resolve tanto o cenário de indicação perdida quanto o de usuário preso na tela de cadastro.

### Mudanças no código

```typescript
// No handleSignup, ao capturar o erro:
if (authError) {
  // Se o usuário já existe, tentar login e verificar se tem org
  if (authError.message?.includes("already registered")) {
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: signupData.email,
      password: signupData.password,
    });
    if (loginErr) throw loginErr;
    
    const userId = loginData.user.id;
    
    // Verificar se já tem organização
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (!existingOrg) {
      // Criar organização que falhou antes (preservando referral)
      const orgPayload = { ... com referred_by_id };
      await supabase.from("organizations").insert(orgPayload);
    }
    
    // Redirecionar
    navigate(fullRedirect, { replace: true });
    return;
  }
  throw authError;
}
```

Também garantir que o profile seja criado se não existir (mesmo tratamento).

