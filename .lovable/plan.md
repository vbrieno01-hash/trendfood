## Diagnóstico

Em `supabase/functions/send-push-notification/index.ts` o envio de Telegram para o **lojista** está depois do `return early` que ocorre quando não há push subscriptions cadastradas. Confirmei chamando a função para a loja "Lanchonete Aguarias Do Eduardo" (chat_id `5305763589`): retornou `"No subscriptions found"` e o Telegram nunca foi disparado.

Como a maioria dos lojistas não habilita push do navegador, nenhuma notificação chega no Telegram deles.

## Separação Admin vs Lojistas (sem conflito)

Hoje as duas vias já usam funções diferentes, mas vou reforçar a separação para ficar 100% isolado:

- **Admin** (você, brenojackson30): `admin-telegram-notify` / `admin-telegram-digest` / `admin-telegram-watchdog` — disparados por triggers do banco. **Não toca neles.**
- **Lojistas**: nova função dedicada `notify-merchant-telegram`, isolada do fluxo de push e do fluxo do admin. O `send-push-notification` deixa de cuidar do Telegram do lojista.

Assim não há risco de uma alteração no fluxo de push afetar o Telegram do lojista, nem do admin.

## Mudanças

1. **Criar `supabase/functions/notify-merchant-telegram/index.ts`** (nova, `verify_jwt = false`)
   - Recebe `{ organization_id, order_number }`.
   - Busca `telegram_chat_id` da org.
   - Se existir, envia mensagem via gateway Telegram (`X-Connection-Api-Key: TELEGRAM_API_KEY`).
   - Independente de push subscriptions — fluxo totalmente separado.

2. **Editar `supabase/functions/send-push-notification/index.ts`**
   - Remover todo o bloco Telegram (linhas 226–262). Função volta a ser exclusiva de Web Push.

3. **Atualizar a trigger `notify_new_order`** (migration)
   - Hoje só dispara `send-push-notification`.
   - Adicionar segunda chamada `pg_net` para `notify-merchant-telegram` em paralelo (independente, fire-and-forget). Se uma falhar, a outra continua.

4. **Adicionar `[functions.notify-merchant-telegram] verify_jwt = false`** em `supabase/config.toml`.

5. **Validar** chamando `notify-merchant-telegram` manualmente para a loja de teste e confirmando recebimento no Telegram do lojista. Verificar que o admin continua recebendo normalmente pelo fluxo dele.

## Resultado

- Telegram do **admin**: intacto, mesma função, mesmas triggers.
- Telegram do **lojista**: função isolada, dispara em paralelo ao push, sem depender dele.
- Zero acoplamento entre os dois fluxos.