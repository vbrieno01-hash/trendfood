## Sandbox real do Robô IA no admin

Transformar a aba "Robô IA" do admin em um sandbox que usa o mesmo fluxo do lojista (uazapi-create-instance + tabela whatsapp_instances), sem nunca persistir token manualmente.

### 1. Migration

Dropar colunas obsoletas de `ai_bot_config`:
- `uazapi_server_url`
- `uazapi_token`
- `uazapi_instance_name`

Manter: `enabled`, `system_prompt`, `greeting_message`, `model`, `test_phone`, `test_org_id`.

### 2. Edge `ai-bot-respond`

- Remover leitura de token do `ai_bot_config`.
- Sempre buscar token vivo em `whatsapp_instances` por `organization_id`.
- Se não houver instância conectada: `return { skipped: 'no_instance' }`.
- Sem fallback para token salvo.

### 3. Edge `whatsapp-webhook`

- Roteamento exclusivo pelo token da instância recebido no payload (`token` / `instance.token`).
- Match com `whatsapp_instances.token` → resolve `organization_id`.
- Sem match → ignora (descarta o "singleton legacy" do admin).

### 4. Edge `uazapi-create-instance`

- Garantir que após criar instância já chama `POST {server}/webhook` configurando URL do `whatsapp-webhook` + eventos `messages` automaticamente.
- Mesmo fluxo serve para lojista e admin.

### 5. UI — `AIBotAdminTab.tsx`

Remover do card "Conexão WhatsApp (uazapiGO)":
- Inputs de `uazapi_server_url`, `uazapi_token`, `uazapi_instance_name`.
- Botão "Testar conexão" que dependia desses campos.
- Lógica de espelhamento em `whatsapp_instances` no `handleSave`.

Adicionar painel dinâmico de sandbox:
- Dropdown "Loja de teste" (lista organizações; default = `test_org_id`).
- Estado real da instância lido de `whatsapp_instances` (status + telefone conectado).
- Botão **Conectar/Reconectar** → chama `uazapi-create-instance` e mostra QR Code inline.
- Botão **Apagar instância** → chama `uazapi-disconnect`.
- Campo "Telefone de teste" (`test_phone`) e botão "Enviar mensagem teste" continuam.

Manter no card "Configuração do Robô": `enabled`, `system_prompt`, `greeting_message`, `model` (essas continuam salvas no `ai_bot_config`).

### Resultado

- Admin = sandbox real, cria/destrói em 1 clique, sem credencial fixa.
- Lojista e admin usam o mesmo caminho de código.
- Bug "token velho salvo no config" some.
- Webhook auto-configurado: chip errado no painel uazapi não trava mais nada.
