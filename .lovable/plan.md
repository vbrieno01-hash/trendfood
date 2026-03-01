

## Plano: Garantir paridade total de funcionalidades nos modais KDS e Gestão de Pedidos

### Problemas identificados

Comparando o `KitchenTab` (dashboard) com o `KitchenPage` (standalone), faltam funcionalidades críticas no KitchenTab:

1. **Sem som de alerta (bell)** -- O KitchenPage toca `playBell()` quando chega pedido novo via Realtime. O KitchenTab não tem isso.

2. **Sem auto-print** -- O KitchenPage tem toda a lógica de `pendingPrintIds`, `isPrintingRef`, `knownIds` para imprimir automaticamente pedidos novos. O KitchenTab não tem nada disso, apesar de exibir o toggle de "Imprimir automático".

3. **Sem notificações push** -- O KitchenPage envia `new Notification(...)` no Realtime. O KitchenTab não.

4. **WaiterTab usa `printOrder` (browser-only)** -- Os botões "Imprimir" dentro do WaiterTab importam `printOrder` em vez de `printOrderByMode`, ignorando Bluetooth/Desktop.

5. **Modais recursivos** -- O KitchenTab dentro do modal do WaiterTab mostra o botão "Gestão de Pedidos" (e vice-versa), criando potencial de modais infinitos aninhados.

### Correções

**Arquivo: `src/components/dashboard/KitchenTab.tsx`**

1. Adicionar a função `playBell()` (copiar do KitchenPage)
2. Adicionar refs: `knownIds`, `pendingPrintIds`, `isPrintingRef` (copiar lógica do KitchenPage)
3. Adicionar canal Realtime dedicado (como no KitchenPage) que:
   - Toca o sino em pedidos novos
   - Adiciona à fila de auto-print quando o toggle está ativo
   - Envia notificação push quando habilitado
4. Adicionar `useEffect` para processar a fila de impressão pendente (como no KitchenPage)
5. Adicionar `useEffect` para marcar pedidos existentes como "conhecidos" na montagem
6. Usar `useRef` para `autoPrint` e `notificationsEnabled` (evitar restart do canal Realtime)
7. Aceitar uma prop opcional `embedded?: boolean` -- quando true, esconder o botão flutuante "Gestão de Pedidos" (previne recursão de modais)

**Arquivo: `src/components/dashboard/WaiterTab.tsx`**

8. Trocar import `printOrder` por `printOrderByMode`
9. Atualizar todas as chamadas de `printOrder(...)` para `printOrderByMode(order, orgName, printMode, orgId, btDevice, pix, printerWidth)`
10. Aceitar prop opcional `embedded?: boolean` -- quando true, esconder o botão flutuante "Monitor da Cozinha"
11. Passar `embedded={true}` no `<WaiterTab>` dentro do Dialog do KitchenTab
12. Passar `embedded={true}` no `<KitchenTab>` dentro do Dialog do WaiterTab

**Arquivo: `src/pages/DashboardPage.tsx`**

13. Nenhuma alteração necessária (props já estão sendo passadas corretamente)

### Detalhes técnicos

- O canal Realtime no KitchenTab usará um nome único (`kitchen-tab-bell-{orgId}`) para não conflitar com o canal do `useOrders`
- Os refs (`autoPrintRef`, `notificationsRef`) garantem que o canal Realtime nunca reinicie quando o usuário alterna os toggles
- A prop `embedded` resolve o problema de modais recursivos: quando aberto dentro de outro componente, os botões flutuantes ficam ocultos
- A troca para `printOrderByMode` no WaiterTab garante que Bluetooth e Desktop Queue funcionem nos botões "Imprimir" da seção de pedidos prontos e aguardando pagamento

