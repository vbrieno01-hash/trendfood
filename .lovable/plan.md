

## Configurar integração iFood com credenciais reais

### Passo 1 — Atualizar secrets do backend
Atualizar os valores de `IFOOD_CLIENT_ID` e `IFOOD_CLIENT_SECRET` com as credenciais reais do portal iFood usando a ferramenta `add_secret`.

### Passo 2 — Testar autenticação OAuth2
Chamar a edge function `ifood-auth` para verificar se o token OAuth2 é gerado com sucesso usando as credenciais reais.

### Passo 3 — Testar polling de eventos
Chamar a edge function `ifood-poll-events` para verificar se consegue se conectar à API do iFood.

### Passo 4 — Ajustar ifood-auth para grant_type correto
O iFood usa `client_credentials` como grant_type inicial (não authorization_code). Verificar e ajustar a edge function `ifood-auth` se necessário para usar o fluxo correto.

### Passo do usuário (no portal iFood)
- Aba Webhook: ativar status, colar URL `https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-webhook`, salvar
- Testar conexão pelo botão do portal

### Arquivos possivelmente alterados
- `supabase/functions/ifood-auth/index.ts` — ajustar grant_type se necessário
- Secrets: `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET` — atualizar valores

