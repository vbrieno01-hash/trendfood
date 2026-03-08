

## Mensagens WhatsApp diferenciadas por tipo de pedido + sem número

O campo `notes` do pedido já contém `TIPO:Entrega` ou `TIPO:Retirada`. Vamos usar essa info para enviar mensagens diferentes e remover o `#número`.

### Mudanças

**1. `src/lib/whatsappNotify.ts`**

- Adicionar função `parseOrderTypeFromNotes(notes)` que extrai `TIPO:x` do campo notes
- `notifyCustomerWhatsApp` — receber `notes` como parâmetro opcional, detectar tipo:
  - **Retirada**: `🍳 *Pedido aceito!* Estamos preparando seu pedido. Avisaremos quando estiver pronto para retirada! 😊`
  - **Entrega**: `🍳 *Pedido aceito!* Estamos preparando seu pedido. Avisaremos quando o entregador sair! 😊`
- `notifyCustomerReady` — mesma lógica:
  - **Retirada**: `✅ *Pedido pronto!* Seu pedido está pronto para retirada! 🎉`
  - **Entrega**: `✅ *Pedido saiu para entrega!* Seu pedido está a caminho! 🛵`
- Remover `#orderNumber` de ambas as mensagens

**2. `src/components/dashboard/KitchenTab.tsx`** e **`src/pages/KitchenPage.tsx`**

- Passar `order.notes` nas chamadas de `notifyCustomerWhatsApp` e `notifyCustomerReady` para que a função saiba o tipo

### Arquivos

1. `src/lib/whatsappNotify.ts` — mensagens diferenciadas + sem número
2. `src/components/dashboard/KitchenTab.tsx` — passar notes
3. `src/pages/KitchenPage.tsx` — passar notes

