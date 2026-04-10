

## Status da Integração iFood — O que falta

### ✅ Já implementado
- Tabela `ifood_credentials` no banco (merchant_id, tokens, status por loja)
- Edge function `ifood-auth` (autenticação OAuth2 com iFood)
- Edge function `ifood-webhook` (receber pedidos, criar no sistema, confirmar no iFood)
- Tela de configuração no dashboard (aba "iFood" em Integrações)

### ❌ O que falta para funcionar

**1. Cadastrar os secrets IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET**
- Você está no portal certo. Use o **fluxo para aplicativos centralizados** (o TrendFood é a plataforma que gerencia múltiplas lojas)
- Após aprovação, o iFood fornecerá o Client ID e Client Secret
- Eu configuro esses secrets no backend assim que você tiver

**2. Configurar o webhook URL no portal iFood**
- Você precisará informar ao iFood a URL do webhook para receber pedidos:
  `https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-webhook`
- Isso é feito no painel do iFood Developer após aprovação

**3. Polling de eventos (melhoria recomendada)**
- A API do iFood na verdade usa **polling** (não webhook push) para pedidos — você busca eventos periodicamente
- Criar edge function `ifood-poll-events` que roda a cada 30s via cron, buscando `/events/v1.0/events:polling`
- Isso é mais confiável que esperar o iFood enviar webhooks

### Próximos passos concretos

| Passo | Quem | O quê |
|-------|------|-------|
| 1 | Você | Completar cadastro no portal iFood (fluxo centralizado) |
| 2 | Você | Me enviar Client ID e Client Secret quando receber |
| 3 | Eu | Configurar os secrets no backend |
| 4 | Eu | Implementar polling de eventos (se necessário pela API do iFood) |
| 5 | Eu | Implementar sincronização de cardápio |

### Arquivo alterado
- Nenhuma mudança de código necessária agora — apenas aguardando as credenciais do iFood

