

## Plano — Mensagem de boas-vindas obrigatória + outros eventos opcionais

Entendi! A imagem que você mostrou é a notificação de **`new_signup`** (novo cadastro chegando pra você como admin). Mas o que você quer é diferente:

> **Toda vez que alguém adicionar um novo destinatário no Telegram (admin OU lojista), o bot deve mandar AUTOMATICAMENTE uma mensagem de boas-vindas pra esse destinatário** — sem precisar clicar em "Testar".

E os outros eventos (pedidos, pagamentos, erros) continuam como estão hoje, disparando só quando faz sentido.

### Como vai funcionar

**1. Admin adiciona destinatário novo (ex: "GB", "Sócio", "Financeiro")**
→ Backend envia automaticamente pra esse Chat ID:

```text
🎉 Bem-vindo ao TrendFood Admin!

Você foi adicionado como destinatário de notificações 
da plataforma por [Nome do Admin].

A partir de agora você vai receber:
• 🆕 Novos cadastros
• 💳 Pagamentos e mudanças de plano
• 🤝 Conversões de afiliados
• ⚠️ Erros críticos do sistema

Se não quiser mais receber, peça pro admin remover seu Chat ID.

— Bot oficial TrendFood
```

**2. Lojista cadastra Chat ID dele na aba Telegram**
→ Backend envia automaticamente pra esse Chat ID:

```text
🎉 Bem-vindo, [Nome da Loja]!

Seu Telegram foi conectado com sucesso ao TrendFood.

A partir de agora você vai receber aqui:
• 🛎️ Novos pedidos chegando
• 📊 Resumo diário de vendas (se ativado)
• ⚠️ Alertas operacionais importantes

Para parar de receber, é só remover o Chat ID nas 
configurações da sua loja.

— Bot oficial TrendFood
```

**3. Eventos operacionais (não mexer)**
- `new_signup`, `subscription_change`, `referral_converted`, `critical_error` → continuam disparando como hoje, só pros admins
- Pedidos pro lojista → continuam via `send-push-notification`

### Implementação

**Backend — `admin-telegram-notify/index.ts`:**
- Nova action `welcome_admin` — envia mensagem de boas-vindas pro chat_id passado, com nome de quem cadastrou
- Verifica se já mandou boas-vindas pra esse Chat ID antes (usa tabela `admin_telegram_dedupe` com `event_type = 'welcome'` pra não mandar 2x se editar)

**Backend — `test-telegram/index.ts`:**
- Nova action `welcome_merchant` — envia mensagem de boas-vindas pro lojista assim que ele cadastrar/atualizar o Chat ID

**Frontend:**
- `AdminTelegramTab.tsx` → ao salvar novo destinatário com sucesso, chama `welcome_admin` automaticamente em background. Se a chamada falhar com `chat not found`, mostra o toast educativo já existente (peça pro destinatário dar `/start` no bot)
- `TelegramTab.tsx` (lojista) → ao salvar Chat ID novo (ou trocar pra um diferente), chama `welcome_merchant` em background. Mesmo tratamento de erro

### Onde mexer

**Editados:**
- `supabase/functions/admin-telegram-notify/index.ts` — adicionar action `welcome_admin` com texto e dedupe
- `supabase/functions/test-telegram/index.ts` — adicionar action `welcome_merchant` com texto
- `src/components/admin/AdminTelegramTab.tsx` — disparar `welcome_admin` após criar destinatário
- `src/components/dashboard/TelegramTab.tsx` — disparar `welcome_merchant` após salvar Chat ID

**Não mexer:**
- Triggers SQL (`trg_admin_notify_new_org`, `trg_admin_notify_subscription_change`, etc.)
- `send-push-notification` (notificação de pedidos pro lojista)
- Tabela `admin_telegram_recipients`, RLS, watchdog, digest

### Resultado

Adicionou destinatário → ele já recebe a mensagem de boas-vindas do bot oficial automaticamente, confirmando que a conexão funcionou. Não precisa mais clicar em "Testar" pra validar — a própria boas-vindas já é o teste. E os eventos operacionais (cadastros, pagamentos, erros) continuam fluindo normalmente como sempre estiveram.

