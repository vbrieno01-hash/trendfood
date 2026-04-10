

## Configurar Credenciais iFood no Backend

Recebi as credenciais OAuth2 da aba Credenciais do portal iFood:

- **Client ID**: `c7b5beb1-1eb6-43da-8005-fc4a269f3bce`
- **Client Secret**: `9nnrf8kof25o5q0z1otynikjqoxmt6uthl3x09ryp7aik4dmgvx0lglha4hd3py2cbxhnfdkfewqwfnpneiakk308tknv702eze`

### O que será feito

1. **Atualizar os secrets** `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET` no backend com os valores reais acima
2. **Ajustar a edge function `ifood-auth`** para usar `grant_type=client_credentials` corretamente no formato que o iFood espera
3. **Testar a autenticação** chamando a edge function para validar que o token OAuth2 é gerado com sucesso

### Detalhes técnicos

- Os secrets serão configurados via ferramenta `add_secret`
- A edge function `ifood-auth/index.ts` será ajustada para enviar os parâmetros no formato correto da API iFood (`grant_type`, `client_id`, `client_secret` como form-urlencoded)
- Após configurar, testaremos a conectividade com `curl_edge_functions`

