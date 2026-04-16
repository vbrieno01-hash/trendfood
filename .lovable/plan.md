
## Migrar integração de WhatsApp pra uazapiGO

### O que muda
Hoje o sistema espera receber/enviar via Evolution API. Você criou uma instância no **uazapiGO free** (`HqrTf5` em `https://free.uazapi.com`) com token `27e8406b-...`. Vamos:

1. Salvar credenciais do uazapiGO no painel admin (não em código)
2. Adaptar webhook pra entender o payload do uazapiGO
3. Enviar resposta do robô **de volta pro WhatsApp** via API do uazapiGO

### Passos

**1. DB: estender `ai_bot_config` com campos da instância**
```sql
ALTER TABLE ai_bot_config
  ADD COLUMN uazapi_server_url text DEFAULT 'https://free.uazapi.com',
  ADD COLUMN uazapi_token text,
  ADD COLUMN uazapi_instance_name text;
```

**2. Painel admin (`AIBotAdminTab.tsx`) — nova seção "Conexão WhatsApp (uazapiGO)"**
Card novo acima de "Configuração" com:
- Input **Server URL** (default `https://free.uazapi.com`)
- Input **Instance Token** (texto monoespaçado, com botão copiar)
- Input **Nome da Instância** (`HqrTf5`)
- Card de instruções passo a passo:
  1. Abre o painel `free.uazapi.com`, cola token e clica **Conectar → Gerar QR Code**
  2. Escaneia QR com WhatsApp
  3. Volta no painel uazapiGO, clica **Configurar Webhook → Criar Webhook**
  4. Cola a URL: `https://xrzudhylpphnzousilye.supabase.co/functions/v1/whatsapp-webhook` (com botão copiar)
  5. Salva e manda mensagem de teste

**3. Edge function `whatsapp-webhook` — adaptar parser**
uazapiGO manda payload diferente da Evolution. Vamos ler ambos formatos pra não quebrar nada:
```ts
// Tenta uazapiGO primeiro
const message = body?.message?.text 
  || body?.text 
  || body?.data?.message?.conversation  // evolution fallback
  || ...;
const phone = body?.message?.sender?.replace(/\D/g, "")
  || body?.sender
  || body?.data?.key?.remoteJid?.replace("@s.whatsapp.net", "")
  || ...;
const fromMe = body?.message?.fromMe ?? body?.fromMe ?? body?.data?.key?.fromMe ?? false;
```

**4. Edge function `ai-bot-respond` — enviar resposta de volta**
Hoje só salva no banco. Adicionar: depois de gerar `reply`, dispara POST pra uazapiGO:
```ts
await fetch(`${cfg.uazapi_server_url}/send/text`, {
  method: "POST",
  headers: { "Content-Type": "application/json", token: cfg.uazapi_token },
  body: JSON.stringify({ number: phone, text: reply })
});
```
(endpoint exato do uazapiGO — vou confirmar na doc deles antes de codar; estrutura padrão é essa)

**5. Manter robô só pro `test_phone`**
Já tá assim — webhook só roteia pro bot quando `phone === test_phone`. Outros números não disparam IA, então sua loja real não corre risco.

### Resultado
Você cola token + instance no painel admin, escaneia o QR no painel da uazapi, configura o webhook lá apontando pra nossa edge function, manda mensagem do seu celular pro número conectado e vê:
- Mensagem aparecendo na "Conversa ao vivo" do painel
- Robô respondendo no seu WhatsApp em segundos
- Tudo logado em `fila_whatsapp`

Lojistas continuam vendo "EM BREVE" — nada muda pra eles.

### Arquivos
- Migration SQL (3 colunas em `ai_bot_config`)
- `src/components/admin/AIBotAdminTab.tsx` (novo card de conexão)
- `supabase/functions/whatsapp-webhook/index.ts` (parser dual)
- `supabase/functions/ai-bot-respond/index.ts` (envio pro uazapi)
