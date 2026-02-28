

## Correção: mapear erro CC_VAL_433 e melhorar feedback

### Problema
- O erro `CC_VAL_433` do Mercado Pago não está mapeado em `mpErrorMessages.ts`
- Com credenciais de teste, cartões reais são rejeitados — o usuário precisa saber disso

### Alterações

**`src/components/checkout/mpErrorMessages.ts`**:
- Adicionar mapeamento para `CC_VAL_433` com mensagem clara: "Erro de validação do cartão. Se estiver em ambiente de teste, use cartões de teste do Mercado Pago."
- Adicionar fallback parcial: se o `statusDetail` contiver "CC_VAL" ou "card_token", mostrar mensagem sobre credenciais de teste

### Resultado
O usuário verá uma mensagem específica indicando que precisa usar cartões de teste do Mercado Pago em ambiente de teste, em vez da genérica "Pagamento recusado".

