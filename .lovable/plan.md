

## Plano — Telegram ao vivo só pra você (admin)

Vou criar um **canal de notificações em tempo real** no Telegram, exclusivo pra você (`brenojackson30@gmail.com`), com tudo que acontece na plataforma.

### O que você vai receber no Telegram (em tempo real)

**🟢 Eventos de crescimento (boas notícias)**
- 🆕 Novo cadastro: `Loja "Pizzaria X" se cadastrou • plano: Trial Pro`
- 💰 Nova assinatura paga: `Pizzaria X assinou Pro Mensal • R$ 49,90`
- 🤝 Indicação convertida: `Pizzaria Y indicou Pizzaria Z (+30 dias Pro)`

**🟡 Eventos de saúde**
- 🛒 Pedido fantasma detectado/limpo
- ⚠️ Erro crítico capturado (checkout, pagamento, impressão)
- 📉 Cancelamento de assinatura: `Pizzaria X cancelou Pro`
- ⏰ Plano expirando em 3 dias

**🔵 Eventos operacionais (resumos)**
- 📊 Resumo diário às 09h: novos cadastros, MRR, pedidos da plataforma nas últimas 24h
- 📈 Resumo semanal aos domingos: comparativo com semana anterior

### Onde configurar (Painel Admin)

Vou adicionar uma nova aba **"Telegram Admin"** no Painel Admin com:
- Campo pro **seu Chat ID pessoal** (separado dos lojistas)
- Toggles pra ligar/desligar cada tipo de evento (cadastros, pagamentos, erros, etc.)
- Botão **"Testar"** que envia uma mensagem de boas-vindas
- Lista das últimas 20 notificações enviadas (auditoria)

### Como vai funcionar tecnicamente

```text
Evento acontece (cadastro, pagamento, erro, etc.)
        ↓
Trigger SQL detecta → chama edge function
        ↓
Edge function `admin-telegram-notify` envia pro seu Chat ID
        ↓
Você recebe instantaneamente no Telegram
```

### Componentes técnicos

**1. Banco de dados (migração SQL)**
- Adicionar em `platform_config`:
  - `admin_telegram_chat_id text` — seu Chat ID
  - `admin_telegram_events jsonb` — quais eventos enviar (default: tudo ligado)
- Nova tabela `admin_telegram_log` (auditoria das últimas mensagens)
- Triggers SQL em:
  - `organizations` (INSERT) → notifica novo cadastro
  - `organizations` (UPDATE de `subscription_plan`) → notifica upgrade/cancelamento
  - `client_error_logs` (INSERT) → notifica erros 🔴 críticos (filtrado pelo classifier)
- Cron job (`pg_cron`) às 09h pra enviar resumo diário

**2. Edge function nova: `admin-telegram-notify`**
- Recebe `{ event_type, payload }`
- Lê chat_id e toggles do `platform_config`
- Formata mensagem em HTML (emoji + negrito + dados)
- Envia via `connector-gateway.lovable.dev/telegram` (já configurado, secret `TELEGRAM_API_KEY` existe)
- Loga em `admin_telegram_log`
- `verify_jwt = false` (chamada por triggers SQL)

**3. Edge function nova: `admin-telegram-digest`**
- Roda às 09h via pg_cron
- Calcula métricas das últimas 24h (novos cadastros, MRR, pedidos totais, taxa de erro)
- Envia resumo formatado

**4. Frontend (1 arquivo novo + 1 edição)**
- `src/components/admin/AdminTelegramTab.tsx` (novo) — UI de configuração
- `src/pages/AdminPage.tsx` — adicionar nova aba "Telegram Admin" no menu

### Segurança / isolamento

- Chat ID admin fica em `platform_config` (singleton, RLS já restringe a admin)
- Notificações **NÃO** vão pros lojistas — só pro seu Chat ID
- Sistema de Telegram dos lojistas (`organizations.telegram_chat_id`) continua intocado
- Usa o **mesmo bot** já configurado (Telegram connector ativo, sem custo extra)

### O que NÃO vou mexer

- Aba Telegram dos lojistas (`TelegramTab.tsx`) — fica como está
- Sistema de push notification dos pedidos — intocado
- Edge functions `test-telegram` e `telegram-automations` — intocadas

### Como você vai usar (passo a passo)

1. Eu termino a implementação
2. Você abre **Painel Admin → Telegram Admin**
3. Cola seu Chat ID pessoal (mesmo bot @userinfobot que os lojistas usam)
4. Clica em "Testar" → recebe mensagem de boas-vindas
5. Pronto — a partir desse momento, recebe tudo ao vivo

### Arquivos envolvidos

- **Novos:**
  - `supabase/functions/admin-telegram-notify/index.ts`
  - `supabase/functions/admin-telegram-digest/index.ts`
  - `src/components/admin/AdminTelegramTab.tsx`
  - 1 migração SQL (colunas + tabela log + triggers + cron)
- **Editados:**
  - `src/pages/AdminPage.tsx` (adicionar aba)
  - `supabase/config.toml` (registrar funções com `verify_jwt = false`)

