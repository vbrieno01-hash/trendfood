

## Plano: Blindar o app contra erros ambientais do Android

### O problema real do cliente
O cliente estava no dashboard pelo celular Android. O Chrome dele gerou erros de DOM (`removeChild`, `insertBefore`) causados pelo proprio navegador/extensoes. O ErrorBoundary interpretou como crash e mostrou a tela "Algo deu errado", impedindo o cliente de usar o app. O erro nao e do seu codigo — e do ambiente Android.

### O que vai mudar
Criar uma lista de padroes de erros conhecidos como nao-acionaveis e filtra-los em 3 pontos do sistema. O app vai simplesmente ignorar esses erros e continuar funcionando.

### Alteracoes

**1. `src/lib/errorLogger.ts`** — Adicionar filtro de erros ignoraveis

Exportar uma funcao `isIgnorableError(message)` que verifica contra padroes conhecidos:
- `removeChild`
- `insertBefore`
- `Failed to construct 'Notification'`
- `ResizeObserver loop`

No `logClientError`, retornar antes de gravar se o erro for ignoravel.

**2. `src/components/ErrorBoundary.tsx`** — Nao crashar para erros ignoraveis

No `componentDidCatch`, importar `isIgnorableError` e, se o erro bater com os padroes, chamar `setState({ hasError: false })` imediatamente. O usuario nao ve nada — o app continua normal.

**3. `src/App.tsx`** — Filtrar nos handlers globais

No `rejectionHandler` e `errorHandler`, verificar `isIgnorableError` antes de chamar `logClientError`. Tambem pular o toast de erro no Android para esses casos.

### Resultado
- Cliente nunca mais vera tela de crash por erros do Android
- Banco de dados nao recebe logs irrelevantes
- Erros reais continuam sendo capturados e logados normalmente
- Tudo automatico, sem intervencao

