
## Causa raiz (3 bugs combinados)

**Bug 1 — Branch legacy filtra errado:** o webhook só responde quando `phone === test_phone`. Mas `test_phone` é o número da LOJA (que usa o WhatsApp), e `phone` é o CLIENTE que mandou mensagem. Esses nunca vão ser iguais, exceto se você se mandar mensagem (impossível). Por isso "oi" entrou na fila como `pendente` mas nunca foi respondido.

**Bug 2 — Falta seed em `whatsapp_instances`:** a instância antiga `HqrTf5` (token `27e8406b-...`) está em `ai_bot_config`, não em `whatsapp_instances`. Branch novo (multi-tenant) não consegue rotear porque não acha a linha. Tabela tá vazia.

**Bug 3 — uazapi não envia `token` no payload, só `instanceName`:** o webhook tenta achar por `body.token` primeiro mas isso vem null. Tem que extrair `body.instanceName` (camelCase, não `body.instance.name`).

## Correções

### 1. Webhook — extrair `instanceName` certo + remover filtro errado
- Adicionar `body.instanceName` (camelCase) na cascata de fallback do `instanceName`
- **Branch legacy:** remover a condição `phone === botCfg.test_phone`. Quando o bot tá enabled e tem `test_org_id` configurado, responde pra qualquer mensagem inbound (que não seja `fromMe`) usando aquela loja como contexto. O `test_phone` vira só um filtro de UI (mostrar conversa de quem na sala de testes), não de roteamento.

### 2. Seed da instância existente em `whatsapp_instances`
- Migration que insere uma linha em `whatsapp_instances` espelhando o que tá em `ai_bot_config` (instance_name `HqrTf5`, token `27e8406b-...`, organization_id da TrendFood, status `connected`). Assim Branch 1 pega o roteamento corretamente.

### 3. Admin — espelhar mudanças do `AIBotAdminTab` em `whatsapp_instances`
Quando você salvar config no admin (token/instance_name/test_org_id), também faz upsert em `whatsapp_instances` pra manter os dois sincronizados. Garante que Branch 1 sempre funcione pra loja de teste.

## Arquivos a editar
- `supabase/functions/whatsapp-webhook/index.ts` — fix do parser `instanceName` + remover filtro `test_phone` no branch legacy
- `src/components/admin/AIBotAdminTab.tsx` — upsert em `whatsapp_instances` ao salvar
- Migration nova — seed da instância TrendFood em `whatsapp_instances`

## Resultado esperado
Você manda "oi" do `558398244382` → uazapi entrega no webhook com `instanceName: "HqrTf5"` → webhook acha a TrendFood na `whatsapp_instances` → roteia pro `ai-bot-respond` com `organization_id` certo → robô responde no seu WhatsApp em segundos.

Lojistas continuam com "EM BREVE".
