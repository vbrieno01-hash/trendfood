

## Plano: Botão "Monitor da Cozinha" na Gestão de Pedidos

### O que muda

Adicionar um botão flutuante fixo no canto inferior direito da aba **Gestão de Pedidos** (`WaiterTab.tsx`). Ao clicar, abre um **Dialog fullscreen** com o componente `KitchenTab` embutido, permitindo marcar pedidos como "Pronto" sem sair da tela.

### Implementação

**Arquivo: `src/components/dashboard/WaiterTab.tsx`**

1. Importar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` e o componente `KitchenTab`
2. Adicionar estado `showKds` (boolean) para controlar o modal
3. Expandir as props do `WaiterTab` para incluir as props necessárias pelo KitchenTab (orgName, storeAddress, courierConfig, printMode, printerWidth, pixKey, btDevice, autoPrint, etc.)
4. Renderizar um botão flutuante fixo (position sticky/fixed bottom-right) com icone de chama + texto "Monitor da Cozinha"
5. Dentro do Dialog (fullscreen via className `max-w-4xl max-h-[90vh] overflow-y-auto`), renderizar `<KitchenTab>` com todas as props necessárias
6. Ao fechar o modal, o estado volta a false -- sem recarregamento

**Arquivo: `src/pages/DashboardPage.tsx`**

7. Passar as props adicionais (storeAddress, courierConfig, printMode, printerWidth, btDevice, autoPrint, onToggleAutoPrint, notificationsEnabled, onToggleNotifications, etc.) para o `<WaiterTab>` na renderização da aba "waiter"

### Detalhes técnicos

- O KitchenTab já usa `useOrders` com Realtime internamente, então o modal terá dados ao vivo automaticamente
- As mutações de status (marcar como Pronto) funcionam independentemente do contexto pai
- O Dialog usa portal, então não interfere no layout da Gestão de Pedidos
- Nenhuma mudança no banco de dados necessária

