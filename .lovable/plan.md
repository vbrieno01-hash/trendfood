
## Painel Admin: Configuração + Teste do Robô de Atendimento

### Objetivo
Criar uma área no Painel Admin (`/admin`) para você configurar e testar o robô de WhatsApp **em modo real**, enquanto pros lojistas a aba continua como "EM BREVE". Você pega 1h de teste, valida o fluxo completo, depois libera pros lojistas quando estiver redondo.

### Arquitetura

```text
LOJISTA (qualquer org)        ADMIN (brenojackson30@gmail.com)
       |                              |
  /dashboard > Robô IA          /admin > Robô IA (nova aba)
       |                              |
   [EM BREVE]                  [Configuração + Teste real]
                                      |
                          ┌───────────┼───────────┐
                          |           |           |
                    Config bot   Conversa teste  Logs
                    (persona,    (chat ao vivo  (fila_whatsapp
                    saudação,    via WhatsApp   já existe)
                    horário)     real)
```

### O que vamos construir

**1. Tabela nova: `ai_bot_config`** (singleton — uma config global do admin pro teste)
- `system_prompt` (text) — persona/instruções do robô
- `greeting_message` (text) — mensagem de boas-vindas
- `model` (text) — `google/gemini-2.5-flash` (rápido + barato pra testes)
- `enabled` (boolean) — liga/desliga o bot
- `test_phone` (text) — seu WhatsApp pro teste
- `test_org_id` (uuid) — qual loja usar como contexto (cardápio, horários etc)
- `updated_at`
- RLS: só admin lê/escreve

**2. Edge Function nova: `ai-bot-respond`** (verify_jwt = false, chamada pelo webhook do WhatsApp)
- Recebe `{ phone, message }`
- Carrega `ai_bot_config` + dados da loja de teste (cardápio, horários, endereço)
- Monta contexto: persona + cardápio + horário + histórico (últimas 10 msgs de `fila_whatsapp` desse phone)
- Chama Lovable AI Gateway (`LOVABLE_API_KEY` já existe) com modelo configurado
- Salva pergunta + resposta em `fila_whatsapp` (tabela já existe)
- Retorna `{ response }` pra ser enviado via Evolution API (mesma ponte WhatsApp já configurada)

**3. Integração com `whatsapp-webhook` existente**
- Adicionar branch: se `ai_bot_config.enabled = true` e mensagem vem do `test_phone` (ou de qualquer número quando ativarmos pra todos depois), encaminha pra `ai-bot-respond` em vez do fluxo normal de impressão/notificação.

**4. Componente novo: `src/components/admin/AIBotAdminTab.tsx`**
- Card "Configuração":
  - Switch ligar/desligar
  - Textarea persona/system_prompt (default já preenchido com persona "atendente educado de delivery")
  - Input mensagem de boas-vindas
  - Select modelo (`gemini-2.5-flash` / `gemini-2.5-pro` / `gpt-5-mini`)
  - Select loja de teste (lista organizations)
  - Input WhatsApp de teste (E.164)
  - Botão "Salvar configuração"
- Card "Conversa de teste ao vivo":
  - Visualização tipo chat (carrega últimas 50 msgs de `fila_whatsapp` do `test_phone` em realtime via Supabase channel)
  - Textarea + botão "Simular mensagem do cliente" (insere uma msg como se viesse do cliente, dispara `ai-bot-respond`, mostra resposta)
  - Botão "Limpar conversa" (apaga histórico do test_phone)
- Card "Status":
  - Total mensagens hoje, taxa resposta, tempo médio
  - Link rápido pro grupo Evolution (Oracle) caso precise checar conexão

**5. Registrar aba no AdminPage**
- Adicionar nova entrada nas tabs do `src/pages/AdminPage.tsx`: `{ value: "aibot", label: "Robô IA", icon: Bot }`
- Renderizar `<AIBotAdminTab />`

**6. Aba do lojista permanece EM BREVE**
- `src/components/dashboard/AIBotTab.tsx` fica exatamente como está — sem mudanças.

### Fluxo de teste real (1h)
1. Você abre `/admin` → aba "Robô IA"
2. Liga o switch, escolhe loja de teste (TrendFood/sua loja matriz), define seu WhatsApp e clica salvar
3. Manda uma mensagem do seu WhatsApp pro número da Evolution (que já tá conectado)
4. Webhook chama `ai-bot-respond`, robô responde via Evolution
5. Você acompanha a conversa em tempo real no painel
6. Ajusta persona/saudação na hora e testa de novo

### Pontos técnicos importantes
- **Contexto da loja**: `ai-bot-respond` carrega `menu_items` (only `available=true`), `business_hours`, `delivery_neighborhoods` da `test_org_id` e injeta tudo no system prompt como Markdown estruturado. Assim o bot já responde com cardápio real.
- **Histórico**: usa as últimas 10 entradas em `fila_whatsapp` filtrando por `phone` pra dar memória de conversa.
- **Sem custo extra de API key**: usa `LOVABLE_API_KEY` que já tá nos secrets.
- **RLS**: tabela `ai_bot_config` só admin acessa; `fila_whatsapp` já tem RLS admin-only.
- **Limites**: rate-limit simples na edge function (max 1 req/segundo por phone) pra evitar loop.

### Arquivos a criar/editar
- **Migration SQL**: cria tabela `ai_bot_config` + RLS admin-only
- **Edge Function nova**: `supabase/functions/ai-bot-respond/index.ts`
- **Edge Function editar**: `supabase/functions/whatsapp-webhook/index.ts` (branch pro bot)
- **Componente novo**: `src/components/admin/AIBotAdminTab.tsx`
- **Editar**: `src/pages/AdminPage.tsx` (registrar tab)

### O que NÃO muda agora
- `src/components/dashboard/AIBotTab.tsx` (lojista) — continua "EM BREVE"
- `DashboardPage.tsx` — sem alteração
- Fluxo de pedidos/impressão do WhatsApp normal — intacto, só ganha um branch pro test_phone

### Resultado
Em poucos minutos você tem uma sala de testes completa: configura o robô, manda WhatsApp real, vê a conversa rolando ao vivo no painel admin, ajusta tom/contexto na hora. Lojistas continuam vendo só "EM BREVE" até você dar o ok pra liberar.
