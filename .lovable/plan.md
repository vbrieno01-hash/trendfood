
# Corrigir persistencia de sessao (login sendo perdido ao fechar o app)

## Problema

Quando voce fecha o site ou app e reabre, ele pede login novamente. Isso acontece porque existe uma "corrida" no codigo de autenticacao: dois processos tentam verificar se o usuario esta logado ao mesmo tempo, e um deles pode concluir antes do outro com a informacao errada (sem sessao), fazendo o app achar que voce nao esta logado e te redirecionar para a tela de login.

## Solucao

Separar as responsabilidades: apenas o carregamento inicial (`getSession`) controla quando o app termina de carregar. O listener de mudancas (`onAuthStateChange`) so atualiza o estado para eventos futuros (login, logout), sem interferir no carregamento inicial.

## Detalhes tecnicos

**Arquivo:** `src/hooks/useAuth.tsx`

Mudancas no `useEffect`:

1. Remover o `setLoading(false)` de dentro do callback `onAuthStateChange` -- ele so deve atualizar `session`, `user`, e buscar a organizacao, mas nunca controlar o estado de `loading`
2. Manter o `getSession()` como unico responsavel por definir `loading = false` apos buscar sessao e organizacao
3. No `onAuthStateChange`, usar `setTimeout` para buscar organizacao (ja esta assim) mas sem chamar `setLoading`
4. Garantir que o listener trata corretamente eventos subsequentes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) sem interferir no carregamento inicial

Fluxo corrigido:

```text
App inicia -> loading = true
  |
  +--> onAuthStateChange registrado (nao muda loading)
  |      Atualiza session/user e busca org em background
  |
  +--> getSession() executa
         Se tem sessao -> busca org -> loading = false
         Se nao tem sessao -> loading = false
```

Isso garante que o app so libera a tela depois de verificar completamente se existe uma sessao salva, evitando o redirecionamento prematuro para /auth.
