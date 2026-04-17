

## Diagnóstico

**O que aconteceu na sua mensagem "oi":**
- Webhook recebeu o payload do uazapiGO 2x (logs confirmam)
- Payload chegou com `message.content.text = "oi"` e `chat.phone = "558398244382"`
- Mas: bot está `enabled=false`, `test_phone=null`, `test_org_id=null` no banco
- Resultado: webhook ignora silenciosamente, robô não responde

**Problema bônus no parser:**
O uazapiGO manda o texto em `body.message.content.text` (objeto aninhado), não em `body.message.text` (string direta) que é o que nosso código tenta primeiro. Hoje só funciona por sorte porque há fallback pra `body.message.content` que retorna o objeto inteiro — não a string.

## Correções

### 1. Corrigir parser do webhook (`whatsapp-webhook/index.ts`)
Adicionar leitura correta dos campos do uazapiGO no início da cascata de fallbacks:
- Texto: `body.message.content.text` (uazapiGO real) → depois fallbacks atuais
- Telefone: `body.chat.phone` ou `body.message.chatid` (já tinha) → depois fallbacks
- fromMe: `body.message.fromMe` (já tinha, ok)
- isGroup: `body.chat.wa_isGroup` ou `body.message.isGroup` (já tinha)

### 2. UI: deixar óbvio que falta configurar (`AIBotAdminTab.tsx`)
Hoje o painel mostra os campos mas não avisa que **sem preencher tudo o robô não funciona**. Vou adicionar:
- Banner amarelo no topo se `enabled=false` OU `test_phone=null` OU `test_org_id=null` listando o que falta
- Botão "Salvar tudo" mais destacado (verde grande) com texto claro: "Ativar robô"
- Após salvar, banner verde: "Robô ativo — mande WhatsApp pro número 5516988083263 do seu celular 558398244382"

### 3. Pré-preencher seu telefone
Pelo log já sei seu WhatsApp: **558398244382**. Vou colocar como placeholder/sugestão clicável no campo `test_phone` pra você só clicar e salvar.

### Arquivos
- `supabase/functions/whatsapp-webhook/index.ts` — parser do uazapiGO correto
- `src/components/admin/AIBotAdminTab.tsx` — banner de status + UX de configuração

### Próximo passo seu (depois do deploy)
1. Vai em /admin → Robô IA
2. Liga o switch **Ativar bot**
3. Cola seu telefone **558398244382** no campo "WhatsApp de teste"
4. Escolhe a loja TrendFood no select "Loja de teste"
5. Clica **Salvar**
6. Manda "oi" do seu WhatsApp pro número conectado (5516988083263)
7. Robô responde em segundos

Lojistas continuam com "EM BREVE" — nada muda pra eles.

