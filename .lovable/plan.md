

## Trocar para credenciais de produção do Mercado Pago

O erro `CC_VAL_433` acontece porque o `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_PUBLIC_KEY` configurados são credenciais de **teste**. Cartões reais são rejeitados com credenciais de teste.

### O que precisa ser feito

1. Acesse sua conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) e copie as **credenciais de produção**:
   - **Access Token** de produção (começa com `APP_USR-...` mas é diferente do de teste)
   - **Public Key** de produção

2. Atualize os dois secrets do projeto com os valores de produção:
   - `MERCADO_PAGO_ACCESS_TOKEN` → Access Token de produção
   - `MERCADO_PAGO_PUBLIC_KEY` → Public Key de produção

### Nenhuma alteração de código é necessária
O código já está preparado para produção. Basta trocar as credenciais.

