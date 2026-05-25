## Problema

O webhook `whatsapp-webhook` só consegue rotear mensagem pro atendente da loja (`ai-bot-respond`) quando encontra uma linha em `whatsapp_instances` casando por `instance_token` ou `instance_name`. No admin (que é só sandbox) você não quer vincular instância a loja nenhuma — quer só colar URL+token de uma instância qualquer do painel uazapi e ver o robô responder usando a `test_org_id` configurada no `ai_bot_config` global.

Hoje a mensagem da instância `mtHUNj` cai no fluxo do Lucas porque não bate com nenhuma loja.

## Solução

Tratar o sandbox como uma rota separada, identificada por `instance_name` ou `instance_token` salvos no próprio `ai_bot_config` global (não em `whatsapp_instances`).

### 1. Banco

Adicionar 2 colunas em `ai_bot_config`:
- `test_instance_name text`
- `test_instance_token text`

Nada de mexer em `whatsapp_instances`. Nenhuma loja é tocada.

### 2. Admin (`AIBotAdminTab.tsx`)

Remover o upsert em `whatsapp_instances`. O "Salvar credenciais" passa a gravar **apenas no `ai_bot_config` global** (linha com `organization_id is null`):
- `test_instance_name`
- `test_instance_token`
- `test_org_id` (loja que vai emprestar o contexto pro robô responder — continua sendo só pra carregar cardápio/horários, não cria vínculo)
- `test_phone`

Botão "Testar /status" continua igual (GET na URL+token informados).

A URL do webhook exibida continua a mesma (`/whatsapp-webhook`).

### 3. Edge function `whatsapp-webhook`

Antes do branch atual de "match em whatsapp_instances", adicionar branch novo de **sandbox**:

```
1. Ler ai_bot_config global (organization_id is null).
2. Se body.instanceName == config.test_instance_name
   OU body.token == config.test_instance_token:
     → chamar ai-bot-respond com:
         phone, message,
         organization_id = config.test_org_id,
         (sem instance_token, pra não confundir)
     → retornar { routed_by: "sandbox" }
```

Se não bater, segue o fluxo atual (match em `whatsapp_instances` → Lucas). Nenhuma loja real é afetada.

### 4. Validação

Mandar mensagem do seu segundo número pra instância `mtHUNj`. Esperado nos logs:
- `[whatsapp-webhook] routed_by: sandbox`
- Resposta gerada via `ai-bot-respond` usando contexto da `test_org_id` (GBflix)
- Resposta volta pelo painel uazapi pro número que mandou

## Detalhes técnicos

- `verify_jwt = false` no webhook permanece.
- O fluxo do Lucas continua intocado.
- `whatsapp_instances` da GBflix permanece como está (pode até deletar a linha órfã `org-mcd-mplkp8ig` depois — opcional, te aviso).
- O `ai-bot-respond` já aceita `organization_id` no body, sem precisar mudar nada lá.
