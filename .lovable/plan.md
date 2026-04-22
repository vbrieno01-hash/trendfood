

## Plano — Aplicar a mesma melhoria de Telegram para os lojistas

Hoje o **bot do TrendFood é o mesmo** pra notificações de admin e de lojistas. Logo, todo lojista que configurar o Chat ID dele também precisa abrir o bot da plataforma e enviar `/start` — senão o Telegram bloqueia o envio com `chat not found` (mesmo problema que aconteceu com o "GB").

A aba do lojista (`TelegramTab.tsx`) hoje:
- Só menciona `@userinfobot` (pra pegar o ID)
- **Não avisa** que precisa iniciar o bot da plataforma
- Quando o teste falha, mostra mensagem genérica ("Falha ao enviar teste")

### O que vou fazer

**1. Atualizar o passo a passo da aba Telegram do lojista**

Adicionar um passo extra no card "Como configurar":

```text
1. Pegue o Chat ID em @userinfobot
2. Abra @NomeDoBotTrendFood e envie /start  ← NOVO (passo crítico)
3. Cole o Chat ID abaixo, teste e salve
```

O nome real do bot será buscado dinamicamente via a action `bot_info` que já criei em `admin-telegram-notify` (reaproveitamento — sem nova edge function).

**2. Toast inteligente no botão "Testar" do lojista**

Reaproveitar a mesma função `explainError()` que criei pro admin. Quando o teste falhar com:
- `chat not found` → "Você ainda não iniciou o @BotTrendFood. Abra o bot no Telegram e envie /start, depois teste de novo."
- `bot was blocked` → "Você bloqueou o bot. Desbloqueie no Telegram e tente novamente."
- Token inválido → "Erro de configuração da plataforma. Avise o suporte."

**3. Atualizar a edge function `test-telegram` pra retornar erro detalhado**

Hoje ela retorna mensagem genérica. Vou fazer ela retornar `{ ok, error, telegram_error }` igual a `admin-telegram-notify`, pra UI conseguir mostrar mensagem precisa.

### Onde mexer

**Editados:**
- `src/components/dashboard/TelegramTab.tsx` — adicionar passo "/start no bot", buscar nome real do bot via `bot_info`, toast inteligente reusando lógica `explainError`
- `supabase/functions/test-telegram/index.ts` — retornar `telegram_error` detalhado em vez de string genérica

**Não mexer:**
- Aba admin (já está pronta)
- Triggers, automações (digest, watchdog)
- `send-push-notification` (envio de pedidos pro lojista)
- Tabela `organizations.telegram_chat_id`

### Resultado

Lojista entra na aba Telegram → vê os 3 passos claros (incluindo o `/start` no bot da plataforma com nome real). Se mesmo assim esquecer, o teste falha com mensagem explicando exatamente o que fazer, em vez de "Falha ao enviar teste".

