

## Integração Telegram para Notificações de Pedidos

### O que será feito

Quando um novo pedido chegar, além da notificação push atual, o sistema também enviará uma mensagem via Telegram para o dono da loja (se configurado).

### Arquitetura

```text
Novo pedido → trigger notify_new_order → send-push-notification
                                          ↓ (já existente)
                                       Web Push
                                          +
                                       Telegram (novo)
                                       ↓
                              Lê telegram_chat_id da organização
                              → Envia via Connector Gateway
```

### Etapas

**1. Conectar o conector Telegram**
- Usar `standard_connectors--connect` para vincular o bot Telegram ao projeto
- Isso disponibiliza `TELEGRAM_API_KEY` e `LOVABLE_API_KEY` nas edge functions

**2. Adicionar coluna `telegram_chat_id` na tabela `organizations`**
- Migração SQL: `ALTER TABLE organizations ADD COLUMN telegram_chat_id text;`
- O dono da loja vai informar o chat_id do Telegram no painel

**3. Atualizar a edge function `send-push-notification`**
- Após enviar os pushes web, verificar se a org tem `telegram_chat_id` preenchido
- Se sim, enviar mensagem via gateway: `POST https://connector-gateway.lovable.dev/telegram/sendMessage`
- Mensagem: "🔔 Novo Pedido #X recebido!"

**4. Adicionar seção "Telegram" no `SettingsTab.tsx`**
- Campo de input para o `telegram_chat_id`
- Instruções simples: "Abra @userinfobot no Telegram, copie seu Chat ID e cole aqui"
- Botão "Testar" que envia uma mensagem de teste
- Botão "Salvar"

**5. Criar edge function `test-telegram` (opcional, para o botão testar)**
- Recebe `chat_id` e envia mensagem de teste via gateway
- Confirma que a conexão funciona antes de salvar

### Resultado

O lojista configura o Chat ID no painel → toda vez que entra um pedido, recebe uma mensagem instantânea no Telegram com o número do pedido, além da notificação push normal.

