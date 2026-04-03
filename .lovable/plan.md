

## Plano: Incluir link de avaliação na mensagem de WhatsApp "Pedido Pronto"

### O que muda
Quando o lojista marca o pedido como "Pronto" e a mensagem de WhatsApp é enviada ao cliente, ela passará a incluir um link clicável para avaliar o pedido.

### Mensagem atual vs nova

```text
ATUAL:
✅ *Pedido pronto!*
Seu pedido está pronto para retirada! 🎉
— Nome da Loja

NOVO:
✅ *Pedido pronto!*
Seu pedido está pronto para retirada! 🎉

⭐ Avalie seu pedido: https://trendfood.lovable.app/avaliar/slug/order-id

— Nome da Loja
```

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/whatsappNotify.ts` | Adicionar parâmetro opcional `reviewUrl?: string` em `notifyCustomerReady` e incluir o link na mensagem |
| `src/pages/KitchenPage.tsx` | Construir a `reviewUrl` com `orgSlug` + `order.id` e passar para `notifyCustomerReady` |
| `src/components/dashboard/KitchenTab.tsx` | Adicionar prop `orgSlug?: string`, construir `reviewUrl` e passar para `notifyCustomerReady` |
| `src/pages/DashboardPage.tsx` | Passar o `slug` da organização como prop `orgSlug` ao `KitchenTab` |

### Detalhes técnicos
- A URL base usada será `window.location.origin` para funcionar tanto em preview quanto em produção
- O link só é adicionado à mensagem se `reviewUrl` for fornecido (retrocompatível)
- Nenhuma mudança no banco de dados

