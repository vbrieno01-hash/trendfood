

## Forçar Home ao abrir o Dashboard

### Problema
A linha 73 do `DashboardPage.tsx` restaura a última aba visitada do `localStorage` (`dashboard_active_tab`). Isso faz com que, ao fazer login, o usuário caia em abas aleatórias (a última que visitou antes de sair).

### Solução
Remover o `localStorage` como fonte para a aba inicial. Manter o fallback do `localStorage` apenas quando a navegação vem de um reload (Android WebView recovery), mas não no login normal.

Na prática, a forma mais simples: só usar `tabFromUrl` ou `tabFromState`, e sempre defaultar para `"home"`. O `localStorage` continua sendo salvo (para recovery de WebView), mas só será usado se não houver `tab` explícito na URL/state.

**Alteração**: remover `tabFromStorage` da prioridade de `getInitialTab`:

```typescript
// ANTES
const raw = tabFromUrl || tabFromState || tabFromStorage || "home";

// DEPOIS  
const raw = tabFromUrl || tabFromState || "home";
```

### Arquivo alterado
- `src/pages/DashboardPage.tsx` — 1 linha

