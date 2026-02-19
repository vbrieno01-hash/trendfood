

# Seleção de forma de pagamento antes do QR Code

## Resumo

Adicionar uma etapa intermediaria apos o envio do pedido onde o cliente escolhe a forma de pagamento:

- **PIX**: mostra o QR Code na hora para pagamento imediato
- **Cartao**: mostra mensagem informando que o pagamento sera feito ao final da refeicao

## Fluxo

1. Cliente monta o pedido e clica "Finalizar Pedido"
2. Pedido e enviado normalmente
3. Tela de sucesso aparece com duas opcoes: "Pagar com PIX" e "Pagar com Cartao"
4. Se escolher PIX: exibe QR Code + botao copiar codigo
5. Se escolher Cartao: exibe mensagem "Pagamento sera realizado ao final da refeicao" com icone de cartao

## Detalhes tecnicos

### Arquivo: `src/pages/TableOrderPage.tsx`

- Adicionar estado `paymentMethod` com valores `null | "pix" | "card"`
- Na tela de sucesso (`if (success)`), quando `paymentMethod` for `null`, mostrar os dois botoes de escolha
- Ao clicar em PIX, setar `paymentMethod = "pix"` e exibir o QR Code (comportamento atual)
- Ao clicar em Cartao, setar `paymentMethod = "card"` e exibir mensagem de pagamento posterior
- O QR Code PIX so aparece se a organizacao tiver `pix_key` configurada. Caso contrario, o botao PIX fica desabilitado ou oculto

### Interface da tela de selecao

Dois cards lado a lado com icones:
- Card PIX: icone QR/PIX, texto "Pagar agora com PIX"
- Card Cartao: icone cartao, texto "Pagar no final"

### Salvar forma de pagamento no pedido

Adicionar coluna `payment_method` na tabela `orders` para registrar a escolha:

```sql
ALTER TABLE public.orders ADD COLUMN payment_method text DEFAULT 'pending';
```

Apos o cliente escolher, atualizar o pedido com `payment_method = 'pix'` ou `payment_method = 'card'`. Isso ajuda o garcom/caixa a saber como cada mesa vai pagar.

### Visibilidade no dashboard

No `WaiterTab` e `KitchenTab`, exibir um badge indicando a forma de pagamento escolhida (ex: "PIX" em verde, "Cartao" em azul).

