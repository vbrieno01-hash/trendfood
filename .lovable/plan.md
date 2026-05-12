## Diagnóstico

Auditei todo o fluxo do Telegram Admin (cron jobs, watchdog, mp-webhook, logs e dados reais do banco). Resultado por evento:

| Evento | Status hoje | Por que você não vê |
|---|---|---|
| 🆕 Novo cadastro | ✅ Funciona | Última msg enviada 09/05 (mostrado no card "Principal") |
| 💰 Mudança de assinatura | ✅ Funciona | Última msg enviada 10/05 |
| 💵 Pagamento confirmado | ✅ Wired no `mp-webhook` | Sem cobranças aprovadas no período recente |
| ❌ Falha de cobrança | ✅ Wired no `mp-webhook` | Nenhum cartão recusado de fato no período. Só dispara em recusa real do Mercado Pago |
| 🔥 Lead quente | ⚠️ Wired no watchdog | Limite atual = **30+ pedidos/dia em loja Free**. A Free com mais pedidos hoje tem só **4**. Limiar nunca é atingido |
| 😴 Loja fria | ⚠️ Wired no watchdog | Você só tem **1** loja Pro ativa (lanchonetedopastor) e ela tem pedido hoje. Nenhuma elegível |
| ⏰ Trial acabando | ⚠️ Wired no watchdog | Zero orgs com trial expirando nos próximos 4 dias |
| 📊 Resumos | ✅ Cron rodando 09h/dom | Funcionou ontem; ocasionalmente cai com `HTTP 502 connectors_gateway` (transitório do gateway Telegram) |
| 🚨 Erro crítico | ❌ **NUNCA DISPARA** | `errorLogger` salva no banco mas **nunca chama** `admin-telegram-notify` |
| 🛒 Pedidos fantasmas | ❌ **NUNCA DISPARA** | `cleanup-phantom-orders` deleta os pedidos mas **nunca chama** `admin-telegram-notify` |

Conclusão: a maioria dos canais está sã — você não recebe mensagem porque a condição real não acontece (sem trial, sem loja fria, sem cartão recusado). Os dois únicos eventos quebrados de fato são `critical_error` e `phantom_orders`.

## Mudanças propostas

### 1. Wire dos 2 eventos quebrados
- **`supabase/functions/cleanup-phantom-orders/index.ts`**: depois de deletar, se `count > 0`, invocar `admin-telegram-notify` com `event_type: "phantom_orders"`, `payload: { count }`.
- **`src/lib/errorLogger.ts`**: quando `severity === "critical"` (ou origem `checkout`/`payment`/`print`), invocar `admin-telegram-notify` com `event_type: "critical_error"`, `payload: { error_message, url, source }`. Throttle simples no DB: dedupe por hash da mensagem nas últimas 1h pra não floodar (usar a tabela `admin_telegram_dedupe` que já existe).

### 2. Tornar Lead Quente realista (configurável)
O limiar hardcoded `>= 30 pedidos/dia` é alto demais pra base atual. Vou:
- Adicionar uma chave `hot_lead_min_orders` em `platform_config` (default `10`).
- O watchdog passa a ler esse valor em vez do `30` fixo.
- Fica fácil você ajustar no painel sem deploy.

### 3. Botão "Forçar varredura agora" no painel
No `AdminTelegramTab`, adicionar um botão "Rodar verificações agora" que invoca `admin-telegram-watchdog` com `mode:"all"`. Hoje só roda 09h/14h/18h/22h, então não dá pra testar na hora.

### 4. Retry leve no envio
No `admin-telegram-notify`, em respostas `502`/`503` do connector gateway, fazer 1 retry com backoff de 1.5s. Reduz os ~3 erros 502 que aparecem nos logs por mês.

## Ordem de execução

1. Migration: chave `hot_lead_min_orders` em `platform_config`.
2. Editar `cleanup-phantom-orders/index.ts`.
3. Editar `src/lib/errorLogger.ts`.
4. Editar `admin-telegram-watchdog/index.ts` (ler config + retry interno se quiser).
5. Editar `admin-telegram-notify/index.ts` (retry 502).
6. Editar `AdminTelegramTab.tsx` (botão "Rodar agora").
7. Testar acionando o watchdog manualmente.

## Detalhes técnicos

- O watchdog tem dedupe por dia/semana via `admin_telegram_dedupe`, então rodar manualmente várias vezes no mesmo dia **não** vai te enviar a mesma loja duas vezes — isso é o comportamento correto.
- `payment_confirmed` e `payment_failed` ficam como estão; só disparam em webhook real do Mercado Pago.
- Não vou mexer no schema dos toggles do painel — todos os 13 já existem corretamente.
