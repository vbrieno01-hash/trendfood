

## Notificação WhatsApp automática quando pedido fica pronto

### Situação atual

- Já existe `notifyCustomerWhatsApp()` que abre `wa.me` com mensagem pré-formatada
- Ela é chamada apenas quando o pedido é **aceito** (pending → preparing)
- Quando o pedido muda para **ready**, nenhuma notificação WhatsApp é enviada

### Alterações

**1. `src/lib/whatsappNotify.ts`** — Adicionar função `notifyCustomerReady` com mensagem específica para pedido pronto:

```typescript
export function notifyCustomerReady(
  phone: string,
  orderNumber: number | string,
  storeName?: string
) {
  const msg =
    `✅ *Pedido #${orderNumber} pronto!*\n` +
    `Seu pedido está pronto para retirada/entrega! 🎉` +
    (storeName ? `\n\n— ${storeName}` : "");
  // ... mesma lógica de wa.me
}
```

**2. `src/components/dashboard/KitchenTab.tsx`** — No `onSuccess` do `handleUpdateStatus`, quando `status === "ready"`, extrair telefone do `notes` e chamar `notifyCustomerReady`:

```typescript
onSuccess: () => {
  if (status === "ready") {
    // Delivery logic (existing)
    if (order && order.table_number === 0) {
      createDeliveryForOrder(...);
    }
    // WhatsApp notification (new)
    if (order) {
      const phone = parsePhoneFromNotes(order.notes);
      if (phone) {
        notifyCustomerReady(phone, order.order_number || order.id.slice(0, 6), orgName);
      }
    }
  }
}
```

**3. `src/pages/KitchenPage.tsx`** — Mesma alteração no `handleUpdateStatus` para manter paridade com o KitchenTab.

### Impacto

- Funciona para todos os clientes automaticamente
- Só abre wa.me se o pedido tiver telefone no campo `notes` (pedidos de mesa não abrem)
- Mesmo padrão já usado na aceitação — operador familiar com o comportamento

