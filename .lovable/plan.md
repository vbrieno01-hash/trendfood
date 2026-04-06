

## Plano: Bloquear pedidos quando a loja fecha (mesmo com itens no carrinho)

### Problema
O cliente reclama que recebe pedidos no WhatsApp mesmo com a loja fechada. Isso acontece porque:

1. **`handleSendWhatsApp`** só verifica `paused` — não verifica `business_hours` (horário de funcionamento)
2. **Botão "Ver pedido"** (floating bar) também só verifica `paused` antes de abrir o checkout
3. **Sem refresh automático** — se o usuário abriu a página com a loja aberta e ficou na página até fechar, o status não atualiza sozinho

### Alterações

**1. `src/pages/UnitPage.tsx`** — 3 correções:

- **`handleSendWhatsApp`**: Adicionar verificação de `business_hours` + `force_open` (igual ao `usePlaceOrder`). Buscar `business_hours, force_open, paused` do banco e chamar `getStoreStatus()`. Se fechado, mostrar toast e bloquear.

- **Botão "Ver pedido" (floating bar)**: Na função `onClick`, além de checar `paused`, também checar `business_hours` com `getStoreStatus()`.

- **Auto-refresh do status**: Adicionar um `setInterval` (a cada 60s) que recalcula `getStoreStatus` com os dados atuais do org. Quando o horário de funcionamento acaba, o UI atualiza automaticamente para mostrar "Fechada" sem o cliente precisar recarregar a página.

### Resultado
- Mesmo que o cliente carregue a página com a loja aberta, quando o horário fechar a UI atualiza em até 1 minuto
- Mesmo que o cliente tente forçar o envio, `handleSendWhatsApp` bloqueia antes de enviar ao WhatsApp
- O `usePlaceOrder` já tem a verificação server-side como última camada de segurança

