

## Problema: Funções faltando no `config.toml`

O `get-mp-public-key` retorna **401 Unauthorized** porque não está listado no `config.toml` com `verify_jwt = false`. Sem a public key, o SDK do Mercado Pago não inicializa, o formulário de cartão não gera token, e nenhum pagamento funciona.

Outras funções também estão faltando no config.toml e podem falhar pelo mesmo motivo.

### Alteração

**`supabase/config.toml`** — Adicionar TODAS as funções faltantes:
- `get-mp-public-key`
- `check-subscription-pix`
- `check-pix-status`
- `generate-pix-payload`
- `verify-pix-payment`
- `create-admin-user`

Cada uma com `verify_jwt = false` (a autenticação já é validada no código de cada função).

### Resultado
O `get-mp-public-key` retornará a chave pública corretamente, o SDK do MP inicializará, e os pagamentos por cartão e PIX voltarão a funcionar.

