

## Atualizar mensagens de erro para produção

O erro ainda mostra "Se estiver em ambiente de teste, use cartões de teste do Mercado Pago" — mas agora estamos em produção. As mensagens precisam ser atualizadas.

### Alterações

**`src/components/checkout/mpErrorMessages.ts`**:
- Remover todas as referências a "ambiente de teste" e "cartões de teste"
- `CC_VAL_433` → "Erro de validação do cartão. Verifique os dados e tente novamente."
- `card_token_service_not_found` → "Erro ao processar cartão. Tente novamente ou use outro cartão."
- Fallback para `CC_VAL` / `card_token` → mensagem genérica sem menção a teste
- Remover constante `TEST_ENV_MSG`

