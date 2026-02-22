
# Impressao automatica independente da aba ativa

## Problema
A logica de escuta Realtime e impressao automatica vive dentro do componente `KitchenTab`. Quando o usuario navega para outra aba (Mesa, Home, Historico etc.), o `KitchenTab` desmonta e o canal Realtime e destruido. Pedidos novos nao sao detectados nem impressos.

## Solucao
Mover a escuta Realtime de novos pedidos e a logica de auto-print para o `DashboardPage`, que permanece montado enquanto o usuario esta logado. O `KitchenTab` continua exibindo os pedidos e permitindo mudar status, mas nao e mais responsavel pela impressao automatica.

## Mudancas

### 1. `src/pages/DashboardPage.tsx` — Adicionar Realtime + auto-print global

Adicionar no nivel do DashboardPage (antes do return):

- Estado `autoPrint` (lido do localStorage, mesmo key `kds_auto_print`)
- Refs `autoPrintRef`, `knownIds`, `pendingPrintIds`, `isPrintingRef`
- Canal Realtime que escuta `INSERT` na tabela `orders` filtrado por `organization_id`
- Quando novo pedido chega: toca bell, marca para impressao se autoPrint ativo, envia notificacao push se habilitado
- useEffect que monitora `orders` carregados e dispara `printOrderByMode` para os pendentes
- Importar `useOrders` apenas para ter acesso aos dados dos pedidos com items (necessario para imprimir)

A logica e essencialmente a mesma que ja existe no KitchenTab, apenas movida para cima.

### 2. `src/components/dashboard/KitchenTab.tsx` — Remover logica duplicada

- Remover o canal Realtime de `INSERT` (o DashboardPage ja cuida)
- Remover os estados/refs de `autoPrint`, `pendingPrintIds`, `isPrintingRef`
- Manter o canal de `UPDATE` para invalidar queries quando status muda
- Manter os botoes de acao (Iniciar preparo, Marcar como Pronto)
- Receber `autoPrint` e `onToggleAutoPrint` como props do DashboardPage (para o toggle continuar funcionando na UI da cozinha)
- Manter o botao de impressao manual por pedido

### 3. `src/pages/KitchenPage.tsx` — Mesma abordagem

A KitchenPage standalone (rota `/kitchen`) ja tem sua propria logica Realtime, entao ela continua funcionando independente. Nenhuma mudanca necessaria aqui.

## Fluxo apos a mudanca

```text
DashboardPage (sempre montado)
  |
  |-- Realtime channel: escuta INSERT em orders
  |-- Auto-print: dispara printOrderByMode para novos pedidos
  |-- Bell + Notificacao push
  |
  |-- Tab ativa (qualquer uma):
       |-- Home, Menu, Mesas, Historico, etc.
       |-- KitchenTab: exibe pedidos + botoes de acao
            (toggle de auto-print controla o estado do pai)
```

## Detalhes tecnicos

- O `useOrders` ja e chamado no DashboardPage para alimentar o KitchenTab. Precisamos garantir que ele tambem esteja disponivel no nivel do Dashboard para a logica de impressao.
- O `playBell()` e as funcoes de notificacao serao extraidas ou duplicadas no DashboardPage.
- Os toggles de "Imprimir automatico" e "Notificacoes" continuam visiveis na UI do KitchenTab, mas controlam estado do pai via props.
- A impressao usa os mesmos `printMode`, `btDevice`, `pixKey`, `printerWidth` que ja estao no DashboardPage.

## Arquivos alterados
- `src/pages/DashboardPage.tsx` (adicionar Realtime + auto-print)
- `src/components/dashboard/KitchenTab.tsx` (remover Realtime de INSERT + receber props)
