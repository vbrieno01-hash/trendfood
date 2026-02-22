
# Atualizar Paineis Standalone (Cozinha e Garcom)

Os paineis standalone (`/cozinha` e `/garcom`) estao desatualizados em relacao as abas do dashboard. Vamos sincroniza-los.

## Problema

As versoes standalone sao usadas em dispositivos dedicados (tablet na cozinha, celular do garcom), mas faltam funcionalidades que ja existem nas abas do dashboard.

### Cozinha (`KitchenPage.tsx`) -- faltam:
- Toggle de notificacoes push (para avisar mesmo com tela apagada)
- Badge do metodo de pagamento (PIX / Cartao) no card do pedido
- Nome do cliente (`customer_name`) nos itens do pedido

### Garcom (`WaiterPage.tsx`) -- faltam muitas coisas:
- Secao "Aguardando Pagamento" (contas em aberto para cobrar)
- Secao "Aguardando PIX" (modo manual -- confirmar antes de enviar pra cozinha)
- Botao de imprimir comanda
- Envio de conta por WhatsApp
- Exibicao de totais e precos
- Badge do metodo de pagamento

## Solucao

Atualizar ambos os arquivos para terem paridade com as versoes das abas do dashboard.

## Alteracoes

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/KitchenPage.tsx` | Adicionar toggle de notificacoes push (mesmo codigo do KitchenTab), badge de metodo de pagamento nos cards, e exibicao de `customer_name` nos itens |
| `src/pages/WaiterPage.tsx` | Reescrever para ter paridade com WaiterTab: adicionar secao "Aguardando PIX", secao "Aguardando Pagamento", botao imprimir, envio WhatsApp, exibicao de totais, badge de pagamento. Buscar tambem o `whatsapp`, `pix_confirmation_mode` e `pix_key` da organizacao |

## Detalhes tecnicos

### KitchenPage.tsx
- Adicionar estado `notificationsEnabled` e `notifPermission` com toggle `Switch`
- Usar refs (`notificationsRef`) para evitar reiniciar o channel realtime
- No callback de INSERT, adicionar `new Notification(...)` quando ativado
- Nos cards: exibir `(order as any).payment_method` como badge e `(item as any).customer_name` nos itens

### WaiterPage.tsx
- Importar hooks `useDeliveredUnpaidOrders`, `useMarkAsPaid`, `useAwaitingPaymentOrders`, `useConfirmPixPayment` de `useOrders`
- Buscar dados da org (`whatsapp`, `pix_confirmation_mode`, `pix_key`) via query a `organizations`
- Adicionar funcao `buildWhatsAppMessage` para gerar link do WhatsApp com a conta
- Adicionar `printOrder` com payload PIX
- Renderizar as 3 secoes: Aguardando PIX (se modo manual), Prontos para Entrega, Aguardando Pagamento
- Manter layout e estilo identico ao `WaiterTab.tsx`
