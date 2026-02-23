

# Corrigir Crash do APK ao Fazer Login

## Problema Identificado

O app Android (APK) fecha ao tentar fazer login. Analisei o codigo e encontrei **3 causas provaveis**:

1. **Promessa nao tratada no useAuth**: Apos o login, o `onAuthStateChange` executa `fetchOrganization` dentro de um `setTimeout` sem tratamento de erro adequado. Se essa chamada falhar no WebView nativo, a rejeicao nao tratada causa crash.

2. **Navegacao concorrente**: O `handleLogin` navega para `/dashboard` ou `/admin`, e ao mesmo tempo o `onAuthStateChange` no `useAuth` tambem dispara logica assincrona. Essa corrida pode causar instabilidade no WebView do Android.

3. **Carregamento pesado pos-login**: A pagina de destino (Dashboard) pode estar carregando recursos pesados que excedem a memoria do WebView.

## Solucao

### 1. Proteger o callback do onAuthStateChange (useAuth.tsx)

Envolver a chamada assincrona dentro do `setTimeout` com try/catch para evitar rejeicoes nao tratadas:

```typescript
setTimeout(async () => {
  if (isMounted.current) {
    try {
      await fetchOrganization(userId);
    } catch (err) {
      console.error("[useAuth] fetchOrganization failed:", err);
    }
    if (isMounted.current) setLoading(false);
  }
}, 0);
```

### 2. Proteger a navegacao no handleLogin (AuthPage.tsx)

Adicionar try/catch especifico ao redor da consulta de roles e navegacao:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoginLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });
    if (error) throw error;
    toast.success("Login realizado com sucesso!");

    if (data.user) {
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        navigate(roleData ? "/admin" : redirectTo, { replace: true });
      } catch {
        // Fallback: navegar para o destino padrao
        navigate(redirectTo, { replace: true });
      }
    } else {
      navigate(redirectTo, { replace: true });
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    toast.error(
      translateAuthError(error.message) ?? error.message ?? "E-mail ou senha incorretos."
    );
  } finally {
    setLoginLoading(false);
  }
};
```

### 3. Fortalecer o handler global de rejeicoes (App.tsx)

Garantir que o handler de `unhandledrejection` realmente previne o crash no WebView nativo:

```typescript
const handler = (e: PromiseRejectionEvent) => {
  console.error("[Unhandled Rejection]", e.reason);
  e.preventDefault();
  // No nativo, mostrar feedback ao usuario
  if (Capacitor.isNativePlatform()) {
    toast.error("Ocorreu um erro inesperado. Tente novamente.");
  }
};
```

### 4. Proteger o getSession inicial (useAuth.tsx)

Adicionar catch no `getSession` para evitar crash caso a sessao local esteja corrompida:

```typescript
supabase.auth.getSession()
  .then(({ data: { session: initialSession } }) => {
    // ... logica existente
  })
  .catch((err) => {
    console.error("[useAuth] getSession failed:", err);
    if (isMounted.current) setLoading(false);
  });
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useAuth.tsx` | try/catch no setTimeout e no getSession |
| `src/pages/AuthPage.tsx` | try/catch na consulta de roles pos-login |
| `src/App.tsx` | Melhorar handler de unhandledrejection para nativo |

## Resultado Esperado

O app Android nao vai mais fechar ao fazer login. Qualquer erro de rede ou de banco sera capturado e exibido como notificacao em vez de causar crash.

