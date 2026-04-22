

## Plano — Garantir que o bot envie pra qualquer destinatário com ID válido

Você tem razão: o destinatário **GB já deu `/start` no @userinfobot** (foi como pegou o Chat ID), mas o erro `chat not found` aconteceu porque **cada bot precisa ser iniciado individualmente** — `/start` no @userinfobot só serve pra descobrir o ID, não autoriza nosso bot do TrendFood a enviar mensagens.

### O problema real

```text
@userinfobot          → mostra o Chat ID (qualquer pessoa pode usar)
@SeuBotDoTrendFood    → precisa de /start específico pra autorizar envio
```

Quando GB nunca abriu o **bot do TrendFood** e mandou `/start` lá, o Telegram retorna `chat not found` na hora de enviar — independente de ter o Chat ID correto.

### Solução em 3 partes

**1. Mensagem de erro clara no toast (em vez de "erro desconhecido")**

Quando o "Testar" falhar com `chat not found`, mostro o nome do bot e o passo exato:

> ❌ **GB precisa iniciar o bot do TrendFood**
> Peça pra GB abrir **@NomeDoSeuBot** no Telegram e enviar `/start`. Só depois disso o bot consegue enviar mensagem pra ele.
> 
> *(Iniciar `/start` no @userinfobot só serve pra pegar o ID — cada bot precisa do `/start` próprio)*

**2. Backend retorna detalhe do erro pra UI mostrar mensagem precisa**

Atualizar `admin-telegram-notify` pra incluir no JSON de resposta:
```json
{
  "ok": false,
  "sent": 0,
  "errors": 1,
  "first_error": "Bad Request: chat not found",
  "first_error_recipient": "GB"
}
```

A UI detecta `chat not found` e mostra o toast educativo. Outros erros (token inválido, rate limit) ganham mensagens próprias também.

**3. Aviso no dialog "Adicionar destinatário" + descobrir nome do bot**

No dialog de cadastro, adicionar um passo claro com o **username real do bot** (descoberto via `getMe` da Telegram API e cacheado em `platform_config`):

```text
⚠️ Antes de funcionar:
1. Pegue o Chat ID em @userinfobot
2. Abra @NomeDoSeuBot e envie /start  ← passo crítico
3. Cole o Chat ID aqui

Se pular o passo 2, o Telegram bloqueia o envio.
```

### Onde mexer

**Editados:**
- `supabase/functions/admin-telegram-notify/index.ts` — incluir `first_error` + `first_error_recipient` no response quando `sent === 0`; expor endpoint auxiliar `?action=bot_info` que chama `getMe` e retorna o username
- `src/components/admin/AdminTelegramTab.tsx` — toast inteligente detectando `chat not found` (e outros erros comuns); buscar username do bot ao abrir dialog de Adicionar; mostrar instruções com nome real do bot

**Não mexer:** triggers SQL, tabela `admin_telegram_recipients`, watchdog, mp-webhook, RLS, lógica de envio multiplexada.

### Resultado

- Você adiciona GB → toast já avisa "peça pra GB iniciar @SeuBot"
- Se mesmo assim ele esquecer, o "Testar" falha com mensagem **exata** ("GB precisa iniciar o bot do TrendFood") em vez de "erro desconhecido"
- Quando GB mandar `/start` no bot certo, próximo "Testar" funciona

