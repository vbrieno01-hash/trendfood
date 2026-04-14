

## Corrigir fluxo de pagamento em mesas

### Problema
Quando o cliente faz pedido na mesa, sempre aparecem as opções "Pagar com PIX" e "Cartão". Isso não faz sentido porque:
1. Falta a opção de **Dinheiro** — o cliente pode querer pagar em espécie
2. Se a loja **não tem pagamento automático** (gateway PIX configurado), não faz sentido perguntar como vai pagar — o pedido já vai direto pra cozinha e o cliente paga no caixa do jeito que quiser

### Solução

**Lógica condicional no `TableOrderPage.tsx`:**

- **Loja SEM pagamento automático** (`pix_confirmation_mode` = `direct` ou `manual`): Após enviar pedido, mostrar apenas "Pedido enviado! 🎉" com a mensagem "Pague no caixa ao final da refeição" — sem perguntar método de pagamento. O pedido vai direto pra cozinha.

- **Loja COM pagamento automático** (`pix_confirmation_mode` = `automatic`): Mostrar 3 opções:
  - **Pagar com PIX** (gera QR Code automático via gateway)
  - **Cartão** (pague no final)
  - **Dinheiro** (pague no caixa)

  O cliente escolhe UMA opção. Se escolher PIX, gera o QR. Se escolher cartão ou dinheiro, confirma o pedido e manda pra cozinha.

### Arquivo editado
- `src/pages/TableOrderPage.tsx` — alterar o bloco `if (!paymentMethod)` para verificar se a loja tem pagamento automático antes de mostrar opções. Adicionar opção "Dinheiro". Adicionar type `"cash"` ao `paymentMethod`.

### Resultado
- Lojas sem gateway: cliente vê só "Pedido enviado", sem confusão
- Lojas com gateway: cliente escolhe entre PIX automático, cartão ou dinheiro

