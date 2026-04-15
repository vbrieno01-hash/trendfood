

## Selecionar método de pagamento ao confirmar pedidos pendentes

### Problema
Quando o operador clica "Confirmar Pag." em um pedido pendente, o sistema apenas marca `paid: true` sem registrar **como** o cliente pagou. O `payment_method` fica como `"pending"` para sempre — não há como saber se foi dinheiro, cartão ou PIX.

### Solução
Substituir o botão direto "Confirmar Pag." por um fluxo com seleção de método. Ao clicar, aparece um mini-menu (popover ou inline) com 3 opções: Dinheiro, Cartão, PIX. Ao selecionar, o sistema atualiza tanto `paid: true` quanto `payment_method` com o valor correto.

### Alterações

**`src/hooks/useOrders.ts`**
- Modificar `useMarkAsPaid` para aceitar um objeto `{ id, paymentMethod }` em vez de apenas `id`
- No `mutationFn`, fazer `update({ paid: true, payment_method: paymentMethod })` 

**`src/components/dashboard/WaiterTab.tsx`**
- No botão "Confirmar Pag." da seção Pagamento (~linha 546), substituir pelo componente com 3 botões inline:
  - 💵 Dinheiro → `handlePay(id, "cash")`
  - 💳 Cartão → `handlePay(id, "card")`
  - 📱 PIX → `handlePay(id, "pix")`
- Atualizar `handlePay` para passar o `paymentMethod`

**`src/pages/WaiterPage.tsx`**
- Mesma alteração no botão de confirmar pagamento (réplica standalone do WaiterTab)

### Resultado
Ao confirmar pagamento de um pedido pendente, o operador escolhe o método real (Dinheiro/Cartão/PIX), e o registro fica correto no histórico.

