

## Fix: Gesto de voltar reseta carrinho e fecha o app

### Problema

Em celulares modernos, o gesto de arrastar para voltar aciona `history.back()`. Como o carrinho e checkout vivem apenas em `useState`, qualquer navegação para trás destrói todo o estado — o cliente perde os itens e volta ao início.

### Solução (2 partes)

**1. Persistir carrinho em localStorage** (`src/pages/UnitPage.tsx`)

- Salvar `cart` em `localStorage` com chave `cart_{slug}` a cada alteração
- Restaurar ao montar o componente
- Limpar apenas no `resetCheckout` (após pedido confirmado)

Isso garante que mesmo se o cliente sair da página acidentalmente, ao voltar o carrinho estará intacto.

**2. Interceptar gesto de voltar com history state** (`src/pages/UnitPage.tsx`)

- Quando o **checkout drawer** abre → `history.pushState({ drawer: "checkout" })`
- Quando o **item detail drawer** abre → `history.pushState({ drawer: "item" })`
- Listener de `popstate`: se o estado anterior era um drawer, apenas fecha o drawer em vez de navegar
- Quando drawers fecham normalmente (pelo X ou arraste), remover a entrada extra do history

Resultado: gesto de voltar fecha o drawer atual em vez de sair da página.

**3. Proteção no DashboardPage** (`src/pages/DashboardPage.tsx`)

- Na montagem, se não há estado no history, fazer `pushState` para criar uma entrada
- No `popstate`, se seria sair do dashboard, re-push e manter na página

### Arquivos a alterar

1. `src/pages/UnitPage.tsx` — localStorage para cart + history state para drawers
2. `src/pages/DashboardPage.tsx` — proteção contra saída acidental por gesto

