

## Resultado dos Testes

### O que funciona
- **`get-mp-public-key`**: Respondendo corretamente (fix do config.toml funcionou)
- **PIX (plano Pro)**: Funcionando — logs mostram `plan=pro amount=99 status=pending detail=pending_waiting_transfer` com QR Code gerado
- **Busca de preços do banco**: Ambas as edge functions estão lendo da tabela `platform_plans` corretamente

### Problemas encontrados

#### 1. Não existe plano de R$ 5
A tabela `platform_plans` mostra:
- `free` → `price_cents = 0` (R$ 0)
- `pro` → `price_cents = 9900` (R$ 99)
- `enterprise` → `price_cents = 24900` (R$ 249)

O plano "Grátis" tem preço R$ 0. A edge function rejeita com "Cannot create subscription for a free plan". Para testar com R$ 5, o `price_cents` do plano `free` precisa ser atualizado para `500`.

#### 2. Cartão rejeitado por risco (`cc_rejected_high_risk`)
Isso é uma avaliação de risco do Mercado Pago, não um bug de código. Pode ocorrer por: cartão de teste em ambiente de produção, valor muito baixo, conta MP nova, etc. O código está correto.

### Alteração necessária

**Atualizar o plano `free` no banco** para `price_cents = 500` (R$ 5) via SQL migration, permitindo o teste real de pagamento. Após validar, reverter para o valor final desejado.

