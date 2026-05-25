# Plano — Modo manual no Sandbox Admin

Você quer voltar a colar URL + token + nome de uma instância criada manualmente no painel uazapi (como na screenshot), atrelado à loja de teste. Salvar no `ai_bot_config` da loja escolhida (não-global). Sem fluxo automático de criação.

## 1. Migration — colunas de override na ai_bot_config

Adicionar 3 colunas na `ai_bot_config` (apenas pra linhas de loja, não pro singleton admin):

- `manual_server_url text` — ex.: `https://free.uazapi.com`
- `manual_instance_token text` — token da instância colado do painel uazapi
- `manual_instance_name text` — nome interno (referência)

Nenhuma RLS nova: a tabela já restringe por dono da org / admin.

## 2. UI — `AIBotAdminTab.tsx`

Remover do card "Conexão WhatsApp (Sandbox)":

- Botão "Conectar / Gerar QR Code" (chamava `uazapi-create-instance`)
- Botão "Apagar instância"
- Painel "Servidor uazapi" (diagnóstico genérico)
- Render do QR Code
- Estado `qrcode`, `instance` derivado de `whatsapp_instances`

Adicionar no mesmo card, logo abaixo do select de loja:

```
[ Loja de teste: ▼ ]

URL do servidor uazapi
[ https://free.uazapi.com                       ]

Token da instância (colar do painel uazapi)
[ ••••••••••••••••••••••••                       ] [👁]

Nome da instância (opcional, só pra referência)
[ teste-bruno                                    ]

[Salvar credenciais]   [Testar /status]

→ status: connected | phone: 55...   (após testar)
```

Comportamento:

- Ao trocar de loja: carrega `manual_server_url`, `manual_instance_token`, `manual_instance_name` dessa linha.
- "Salvar credenciais": faz upsert em `ai_bot_config` (atrelado a `organization_id = test_org_id`) e também sincroniza em `whatsapp_instances` (linha por org) — essa é a fonte que o `ai-bot-respond` lê pra responder. Se a linha não existe, cria; se existe, atualiza.
- "Testar /status": `POST {manual_server_url}/instance/status` com header `token: manual_instance_token`. Mostra status / telefone conectado / erro inline.
- Painel mantém o card de simulador (chat com `test_phone`) e o card "Configuração do Robô" intactos.

## 3. Webhook — instruções pro usuário

Como o token é colado manualmente, o webhook precisa apontar pro nosso endpoint. Adicionar embaixo das credenciais um aviso fixo:

```
⚠ Configure no painel uazapi → Webhooks da instância:
URL: https://xrzudhylpphnzousilye.supabase.co/functions/v1/whatsapp-webhook
Eventos: messages
[Copiar URL]
```

Botão "Copiar URL" copia pro clipboard. Sem chamada automática pra `/webhook` do uazapi — você configura na mão lá, como na sua screenshot.

## 4. Limpeza

- Apagar edge function `uazapi-create-instance` (não é mais chamada pelo admin).
- Apagar edge function `uazapi-server-info` (criada no passo anterior, não usada mais).
- `whatsapp-webhook` e `ai-bot-respond` permanecem como estão: continuam achando o token vivo em `whatsapp_instances` pelo match do token recebido. A loja de teste passa a ter uma linha real em `whatsapp_instances` salva pelo admin.

⚠ Atenção: o fluxo do **lojista** (`AIBotTab.tsx`) ainda chama `uazapi-create-instance`. Se eu apagar a função, quebra o lojista. Vou manter a função no servidor (deployada) mas remover do admin. Só removo da UI admin.

## Arquivos

- Migration: novo arquivo SQL com `ALTER TABLE public.ai_bot_config ADD COLUMN ...`
- `src/components/admin/AIBotAdminTab.tsx` — refatorado conforme acima

Nada no backend além da migration.
