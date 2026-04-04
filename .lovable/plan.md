

## Plano: Atualizar credenciais do Mercado Pago para conta CNPJ

### O que será feito
Atualizar os dois secrets existentes com as credenciais de produção da nova conta CNPJ:

1. **MERCADO_PAGO_ACCESS_TOKEN** — usado nas Edge Functions para criar cobranças PIX e assinaturas
2. **MERCADO_PAGO_PUBLIC_KEY** — usado no checkout transparente (cartão de crédito)

### Como funciona
- Vou usar a ferramenta de adicionar secret para solicitar cada credencial
- Você cola o valor quando o campo aparecer
- Pronto — todos os pagamentos (assinaturas e PIX) passam a cair na conta do CNPJ automaticamente

### Impacto
- Zero mudanças de código
- Assinaturas **existentes** continuam vinculadas à conta antiga até serem renovadas ou recriadas
- Novas assinaturas e pagamentos PIX vão direto para a conta do CNPJ

