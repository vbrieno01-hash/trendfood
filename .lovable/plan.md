
## Sua pergunta: precisa ser manual?

**Hoje sim** — só dá pra cadastrar 1 instância (a sua de teste) no painel admin. Pra escalar pros lojistas, tem 2 caminhos:

### Caminho A — Self-service automático (recomendado)
Lojista clica "Conectar WhatsApp" no dashboard dele → sistema usa seu **admintoken** pra:
1. Criar instância nova no servidor uazapi via API
2. Mostrar QR Code pro lojista escanear no celular
3. Configurar webhook automaticamente apontando pra nossa edge function
4. Pronto, bot da loja funcionando — sem você intervir

### Caminho B — Manual no admin
Você cria a instância no painel uazapi, copia token, cola no admin "Gerenciar Loja → Bot". 1 a 1, na mão. Bom só pros primeiros 5-10 lojistas.

---

## Plano: implementar Caminho A (self-service)

### O que construir

**1. Banco — nova tabela `whatsapp_instances`** (uma por loja)
- `organization_id`, `instance_name`, `instance_token`, `status` (disconnected/connecting/connected), `phone_connected`, `webhook_configured`, `created_at`, `connected_at`

**2. Secrets** — guardar no Lovable Cloud:
- `UAZAPI_ADMIN_TOKEN` = `ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t`
- `UAZAPI_SERVER_URL` = `https://free.uazapi.com`

**3. Edge functions novas**
- `uazapi-create-instance` — usa admintoken pra criar instância nova pro lojista (`POST /instance/init`), salva token na tabela, configura webhook automaticamente
- `uazapi-instance-status` — polling pra UI saber quando conectou (`GET /instance/status` com token da instância)
- `uazapi-disconnect` — desconecta e deleta instância

**4. Edge functions adaptar**
- `whatsapp-webhook` — em vez de filtrar por `test_phone`, agora identifica a loja pelo **token da instância** que recebeu o evento (header `instance` ou query string que o uazapi manda) e roteia pra `ai-bot-respond` com `organization_id` certo
- `ai-bot-respond` — receber `organization_id` em vez de depender do `test_org_id` do singleton; carrega cardápio/horário/config da loja correta; envia resposta usando o `instance_token` daquela loja

**5. UI — aba Robô IA do lojista (`AIBotTab.tsx`)**
Sai do "EM BREVE", vira fluxo real:
- Estado **desconectado**: card "Conectar WhatsApp do meu negócio" com botão verde
- Ao clicar: chama `uazapi-create-instance`, mostra QR Code grande na tela + instrução "Abre WhatsApp → Aparelhos conectados → Conectar"
- Polling a cada 3s no `uazapi-instance-status` até virar `connected`
- Estado **conectado**: card verde mostrando o número conectado, botão "Desconectar", configurações (mensagem de boas-vindas, prompt do bot, modelo IA)

**6. Painel admin — aba "Instâncias WhatsApp" (extra)**
Visão de todas as instâncias ativas no servidor uazapi: lojista, número, status, último uso. Você consegue desconectar manualmente se precisar.

### Antes de eu começar, preciso confirmar 3 coisas

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. LIBERAÇÃO PROS LOJISTAS                                   │
│    a) Liberar pra todos (Grátis + Pro + Enterprise)          │
│    b) Só Pro/Enterprise (feature paga, controla volume)      │
│    c) Continua "EM BREVE" — só você (admin) usa por enquanto │
│                                                              │
│ 2. LIMITE DO SEU PLANO FREE UAZAPI                           │
│    a) Não sei — eu confiro na doc deles antes de codar       │
│    b) Já vi, aguenta várias instâncias                       │
│    c) Aguenta poucas — fazer híbrido (só Pro/Enterprise)     │
│                                                              │
│ 3. CUSTO DE IA POR LOJA                                      │
│    Cada conversa consome créditos do Lovable AI Gateway.     │
│    a) Sem limite — qualquer loja usa à vontade               │
│    b) Limite mensal por loja (ex: 500 mensagens/mês Free,    │
│       ilimitado Pro)                                         │
│    c) Definimos depois, agora só implementa o fluxo          │
└──────────────────────────────────────────────────────────────┘
```

Me responde os 3 pontos (ou só fala "vai no padrão" que eu uso: 1c continua EM BREVE, 2a eu confiro, 3c definimos depois) e eu já começo a construir o self-service.
