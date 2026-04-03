

## Plano: Unificar Cozinha e Gestão de Pedidos em uma aba só

### Situação atual
- `KitchenTab` e `WaiterTab` já são interdependentes: KitchenTab tem botão flutuante que abre WaiterTab em dialog, e WaiterTab tem botão que abre KitchenTab em dialog
- No sidebar do dashboard são 2 itens separados ("Cozinha (KDS)" e "Gestão de Pedidos")

### O que será feito

| # | Mudança |
|---|---------|
| 1 | Criar um novo componente `OperationsTab.tsx` que renderiza `KitchenTab` e `WaiterTab` lado a lado em telas grandes, e com sub-abas (toggle) em mobile |
| 2 | No sidebar do `DashboardPage.tsx`, substituir os 2 itens por 1 item "Operacional (KDS)" com ícone de Flame |
| 3 | Remover a tab key `waiter` e usar apenas `kitchen` (ou renomear para `operations`) |
| 4 | O lock segue a regra mais restritiva (se qualquer um dos dois estiver locked, mostra upgrade) |

### Layout do componente unificado

```text
┌─────────────────────────────────────┐
│  [🔥 Cozinha]  [🔔 Gestão]  ← toggle │
├─────────────────────────────────────┤
│                                     │
│   Conteúdo da aba selecionada       │
│   (KitchenTab ou WaiterTab)         │
│                                     │
└─────────────────────────────────────┘
```

- Sub-abas internas com Tabs do shadcn
- KitchenTab renderizado com `embedded=true` (sem botão flutuante de Gestão)
- WaiterTab renderizado com `embedded=true` (sem botão flutuante de Cozinha)

### Detalhes técnicos
- Novo arquivo: `src/components/dashboard/OperationsTab.tsx`
- `DashboardPage.tsx`: remove item `waiter` do sidebar, renomeia `kitchen` para `operations` com label "Cozinha & Pedidos"
- Passa todas as props necessárias (impressora, bluetooth, notificações, etc.) para o componente unificado
- Lock check: `lockedFeatures.kitchen || lockedFeatures.waiter`

### Resultado
- 1 arquivo novo (`OperationsTab.tsx`)
- 1 arquivo editado (`DashboardPage.tsx`)
- Sidebar mais limpo, funcionalidade 100% preservada

