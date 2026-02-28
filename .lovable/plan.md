

## Atualizar credenciais do Mercado Pago para produção

### O que será feito
Atualizar os dois secrets existentes com as credenciais de produção:

1. **MERCADO_PAGO_ACCESS_TOKEN** — seu Access Token de produção (começa com `APP_USR-`)
2. **MERCADO_PAGO_PUBLIC_KEY** — sua Public Key de produção (começa com `APP_USR-`)

### Como funciona
- Vou abrir o formulário seguro para você colar cada credencial
- Após salvar, as edge functions já usarão as credenciais de produção automaticamente
- Nenhuma alteração de código é necessária

