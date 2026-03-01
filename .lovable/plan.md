

## Plano: Botão "Gestão de Pedidos" na Cozinha (KDS)

### O que muda

Adicionar um botão flutuante fixo no canto inferior direito da aba **Cozinha** (`KitchenTab.tsx`), espelhando o que já existe no `WaiterTab`. Ao clicar, abre um **Dialog** com o componente `WaiterTab` embutido.

### Implementação

**Arquivo: `src/components/dashboard/KitchenTab.tsx`**

1. Importar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` de `@/components/ui/dialog` e o ícone `BellRing`
2. Importar `WaiterTab` de `@/components/dashboard/WaiterTab`
3. Expandir `KitchenTabProps` para incluir as props extras que o WaiterTab precisa: `whatsapp`, `pixConfirmationMode`
4. Adicionar estado `showWaiter` (boolean)
5. No final do JSX (antes do `</div>` raiz), renderizar:
   - Botão flutuante fixo com ícone `BellRing` + texto "Gestão de Pedidos"
   - Dialog (`max-w-5xl`, `max-h-[90vh]`, `overflow-y-auto`) contendo `<WaiterTab>` com todas as props necessárias

**Arquivo: `src/pages/DashboardPage.tsx`**

6. Passar as props `whatsapp` e `pixConfirmationMode` para `<KitchenTab>` na linha 903

### Detalhes técnicos

- O WaiterTab usa seus próprios hooks (`useOrders`, `useDeliveredUnpaidOrders`, etc.) internamente — funciona de forma autônoma
- O WaiterTab dentro do modal também terá o botão "Monitor da Cozinha", mas como já estamos na cozinha, isso é apenas visual (não causa loop — cada modal é independente)
- Nenhuma mudança no banco de dados

