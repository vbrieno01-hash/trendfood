
## Estado atual

Já existe a infra do modo automático, mas **desconectada**:

- Função `wa_enqueue_status(org, order, event)` que insere mensagens no `whatsapp_outbox` usando templates de `organizations.wa_auto_status` (gate atual: só `wa_auto_status.enabled=true`).
- Função `tg_orders_wa_auto_status()` existe mas **não está anexada como trigger** na tabela `orders`.
- Edge function `process-wa-outbox` consome a fila e envia via Uazapi (com `whatsapp_instances` da loja).
- Existem ainda as funções manuais `uazapi-notify-customer` (status) e `uazapi-notify-owner` (novo pedido), chamadas em `useOrders.ts`, `useCourier.ts` e `UnitPage.tsx` — hoje gated por `whatsapp_bot_allowed=true`, ou seja, **só rodam quando o robô está liberado**.
- Flag `organizations.whatsapp_bot_allowed` já existe (admin controla).

Problema: mesmo com o robô liberado nada dispara automaticamente (trigger ausente) e, se eu plugar o trigger, vou duplicar com as chamadas manuais do frontend.

## Decisão de modos

| Modo     | Critério                                            | Comportamento                                                                                                              |
| -------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Manual   | `whatsapp_bot_allowed = false` **ou** sem instância | Lojista usa botões de "avisar cliente" e o fluxo público continua igual. Nenhum envio automático.                          |
| Automático | `whatsapp_bot_allowed = true` **e** instância conectada | Triggers do banco enfileiram em `whatsapp_outbox` em todas as transições. Frontend não envia mais nada por conta própria. |

## Mudanças

### 1. Banco (migration única)

- **Reescrever `wa_enqueue_status`** para:
  - Gate principal: `organizations.whatsapp_bot_allowed = true` (não mais o `wa_auto_status.enabled`, que vira opcional/legado).
  - Verificar plano via `get_effective_plan(org) IN ('pro','enterprise','lifetime')`.
  - Exigir instância em `whatsapp_instances` com status `connected|open` — senão registra `skipped` em `whatsapp_notification_log` e sai (falha silenciosa).
  - Anti-duplicata: ignorar se já existe linha em `whatsapp_outbox` ou `whatsapp_notification_log` para o mesmo `(order_id, event_type)` nos últimos 60s.
  - Templates: se a loja tiver `wa_auto_status.templates[event]` usa, senão usa **template padrão embutido** (cobre os textos exigidos pelo usuário, com `{nome}`, `{numero}`, `{total}`).
  - Normalizar telefone (já feito em `wa_extract_phone`, mantém).

- **Reescrever `tg_orders_wa_auto_status`** para cobrir:
  - `INSERT`: enfileira `new_order_customer` (msg pro cliente "recebemos seu pedido") **e** `new_order_owner` (msg pro dono, usando `organizations.whatsapp`).
  - `UPDATE` quando muda `status`: `preparing`, `ready_pickup`/`ready_delivery` (decidido por `TIPO` nas notes), `out_for_delivery` (quando entra em `deliveries`/status `dispatched`), `delivered`, `cancelled`.
  - Para evento `new_order_owner`, enfileira com `phone = organizations.whatsapp` (em vez de extrair das notes).

- **Criar o trigger** de fato:
  ```sql
  CREATE TRIGGER trg_orders_wa_auto_status
    AFTER INSERT OR UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.tg_orders_wa_auto_status();
  ```

- **Trigger "saiu para entrega"**: adicionar `tg_deliveries_wa_dispatched` em `public.deliveries` (AFTER UPDATE quando muda para `dispatched`/equivalente) chamando `wa_enqueue_status(..., 'out_for_delivery')`.

- **pg_cron**: garantir job a cada 1 min chamando `process-wa-outbox` (se já não existir). Será criado via `supabase--insert` numa segunda etapa pois usa anon key.

### 2. Edge function `process-wa-outbox`

- Continua como está, mas grava sempre em `whatsapp_notification_log` (status `sent`/`failed`/`skipped`) para auditoria por pedido.
- Em caso de instância desconectada/erro Uazapi: marca outbox como `failed`, registra no log e **não propaga** (cozinha nunca trava).

### 3. Frontend (evitar duplicação)

Nos pontos onde hoje chamamos `uazapi-notify-customer` / `uazapi-notify-owner`, passar a checar `whatsapp_bot_allowed` da org carregada e:

- Se `true` (modo automático) → **não chamar** nada (trigger cuida).
- Se `false` (modo manual) → manter o comportamento atual (botão manual do lojista, se houver) — sem novos disparos automáticos.

Arquivos: `src/hooks/useOrders.ts`, `src/hooks/useCourier.ts`, `src/pages/UnitPage.tsx`.

`WhatsAppAutoStatusCard.tsx` continua editando os templates (agora opcionais/customização), mas a flag de liga/desliga real é a `whatsapp_bot_allowed` controlada pelo admin — adicionar nota na UI.

### 4. Robustez

- Telefone: `wa_extract_phone` já normaliza; `process-wa-outbox` reaplica prefixo 55.
- Dedup: índice parcial novo em `whatsapp_outbox(order_id, event_type)` para `created_at > now()-60s` + check explícito no `wa_enqueue_status`.
- Falha silenciosa: triggers usam `EXCEPTION WHEN OTHERS THEN RETURN NEW/NULL` ao redor do enqueue.

## Fora do escopo

- Não muda o painel admin nem o fluxo de conexão/QR.
- Não mexe no bot conversacional (`ai-bot-respond`) nem em `fila_whatsapp`.
- Não altera o design.

## Resultado

- Loja com robô ligado: ao criar pedido, dono recebe alerta no WhatsApp e cliente recebe confirmação automaticamente; a cada mudança de status no painel Cozinha, cliente recebe mensagem sem clique nenhum.
- Loja sem robô: nada muda em relação ao fluxo de hoje.
