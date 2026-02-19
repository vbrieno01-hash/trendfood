
# Corrigir Navegacao (Botao Voltar) do Site

## Problema

O botao "voltar" do navegador nao funciona como esperado porque:

1. **Redirecionamentos empurram entradas extras no historico**: Quando o usuario e redirecionado de `/auth` para `/dashboard` (apos login) ou de `/dashboard` para `/auth` (sem sessao), o app usa `navigate()` sem `replace`, criando um loop de redirecionamento ao clicar "voltar".

2. **Signup e login nao substituem o historico**: Apos criar conta ou fazer login, o usuario e levado ao dashboard, mas ao clicar "voltar" ele volta para `/auth`, que o redireciona de novo para `/dashboard`.

3. **As abas do Dashboard nao usam a URL**: Trocar de aba (Cardapio, Mesas, Cozinha, etc.) nao altera a URL, entao o botao voltar do navegador sai do dashboard inteiro em vez de voltar para a aba anterior.

## Solucao

### 1. Usar `replace: true` nos redirecionamentos de autenticacao

Todos os `navigate()` que sao redirecionamentos automaticos (nao iniciados pelo usuario) devem usar `replace: true` para nao poluir o historico.

**Arquivos afetados:**
- `src/pages/DashboardPage.tsx` — linha 62: `navigate("/auth")` ao detectar usuario deslogado
- `src/pages/AuthPage.tsx` — linhas 158 e 186: `navigate("/dashboard")` apos login/signup

### 2. Sincronizar abas do Dashboard com a URL

Usar query parameters (ex: `/dashboard?tab=menu`) para que cada aba tenha sua propria entrada no historico do navegador. Assim, o botao voltar navega entre abas visitadas.

**Arquivo afetado:**
- `src/pages/DashboardPage.tsx`

**Logica:**
- Ao clicar em uma aba, atualizar a URL com `navigate("/dashboard?tab=menu")` (push, nao replace)
- Ao carregar a pagina, ler o parametro `tab` da URL para definir a aba ativa
- Manter compatibilidade com `location.state.tab` existente (para links internos que ja usam esse padrao)

### 3. Corrigir `signOut` para usar `replace`

Ao fazer logout, substituir a entrada no historico para que o usuario nao volte ao dashboard (sem sessao) ao clicar "voltar".

**Arquivos afetados:**
- `src/pages/DashboardPage.tsx` — `handleSignOut`
- `src/pages/AdminPage.tsx` — `handleSignOut`
- `src/components/dashboard/SettingsTab.tsx` — `navigate("/auth")` apos desativar conta

## Detalhes tecnicos

### DashboardPage.tsx

```text
ANTES:  navigate("/auth")
DEPOIS: navigate("/auth", { replace: true })

ANTES:  navigate("/dashboard", { replace: true })  // checkout - ja correto
```

Abas com URL:
```text
// Ler aba da URL ao carregar
const params = new URLSearchParams(location.search);
const tabFromUrl = params.get("tab") as TabKey | null;
const tabFromState = (location.state as { tab?: string })?.tab as TabKey | null;
const initialTab = tabFromUrl || tabFromState || "home";

// Ao trocar de aba, atualizar URL
const handleTabChange = (key: TabKey) => {
  setActiveTab(key);
  navigate(`/dashboard?tab=${key}`, { replace: false });
};
```

### AuthPage.tsx

```text
ANTES:  navigate("/dashboard")
DEPOIS: navigate("/dashboard", { replace: true })

ANTES:  navigate(roleData ? "/admin" : redirectTo)
DEPOIS: navigate(roleData ? "/admin" : redirectTo, { replace: true })
```

### AdminPage.tsx

```text
ANTES:  navigate("/auth")
DEPOIS: navigate("/auth", { replace: true })
```

### SettingsTab.tsx

```text
ANTES:  navigate("/auth")
DEPOIS: navigate("/auth", { replace: true })
```

## Resumo de alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/DashboardPage.tsx` | Redirect para `/auth` com `replace: true`; abas sincronizadas com URL via query param `?tab=` |
| `src/pages/AuthPage.tsx` | Navegacao pos-login/signup com `replace: true` |
| `src/pages/AdminPage.tsx` | Logout com `replace: true` |
| `src/components/dashboard/SettingsTab.tsx` | Logout/desativar com `replace: true` |

Nenhuma tabela ou backend e alterado. Apenas navegacao frontend.
