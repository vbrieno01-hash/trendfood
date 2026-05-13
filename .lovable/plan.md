## Problema

Hoje o trigger `deduct_stock_and_disable` apenas subtrai do estoque quando `paid` vira `true`, e desativa o produto se a quantidade ficar ≤ 0. Mas:

- Não avisa o lojista quando o estoque ficou negativo (cliente pediu mais do que havia).
- Não há alerta visual/sonoro no painel quando isso acontece.
- O lojista só descobre depois, quebrando a operação (ex: 10 pedidos x estoque 3 = 7 clientes sem produto).

## Solução proposta

### 1. Detectar "ruptura de estoque" no banco

Criar nova tabela `stock_alerts`:
- `organization_id`, `order_id`, `stock_item_id`, `stock_item_name`
- `requested_qty`, `available_qty`, `shortage` (quanto faltou)
- `menu_item_name`, `acknowledged` (boolean), `created_at`

Alterar a função `deduct_stock_and_disable`:
- Antes de subtrair, comparar `quantity_used * order_qty` com `stock_items.quantity`.
- Se `requested > available`, inserir registro em `stock_alerts` com o "shortage".
- Continuar subtraindo (estoque pode ficar negativo) e desativar o produto como já faz hoje.

Habilitar Realtime em `stock_alerts` (REPLICA IDENTITY FULL + publicação).

### 2. RLS

- SELECT/UPDATE: apenas membros da organização (mesmo padrão das outras tabelas do dono).
- INSERT: apenas via trigger (SECURITY DEFINER), sem policy pública.

### 3. Notificação ao lojista

Três camadas, todas disparadas pelo mesmo evento de inserção em `stock_alerts`:

a) **Painel (tempo real)**: novo badge vermelho no header do dashboard + toast sonoro quando chega um alerta novo. Subscribe via Realtime no `Dashboard` (canal global).

b) **Aba Insumos**: card destacado no topo listando rupturas pendentes ("Pediram 10 de X-Burger, só havia 3 — faltaram 7"), com botão "Resolvi / Repor estoque" que marca `acknowledged = true`.

c) **Push + Telegram do lojista**: trigger `AFTER INSERT` em `stock_alerts` chama via `pg_net` as Edge Functions já existentes (`send-push-notification` e `notify-merchant-telegram`) com um novo `event_type = 'stock_shortage'`. Atualizar essas funções para formatar a mensagem ("⚠️ Faltou estoque: 7 unidades de Carne no pedido #123").

### 4. UI

- `StockTab.tsx`: bloco `StockAlertsPanel` no topo (só aparece se houver alertas não reconhecidos), com lista, botão "Marcar como resolvido" e link para o pedido.
- `Dashboard` header: ícone sino com contador de alertas pendentes.

### 5. Detalhes técnicos

- Tabela `stock_alerts` com índice em `(organization_id, acknowledged, created_at DESC)`.
- Reutilizar `useQueryClient().invalidateQueries(['stock-alerts'])` no Realtime subscriber.
- Som de alerta: usar o mesmo `Audio` do KDS.
- Edge Functions: ramo extra no payload — se `event_type === 'stock_shortage'`, montar título "Estoque insuficiente" e corpo com produto + quantidade faltante.

## Fora de escopo

- Reserva preditiva de estoque no checkout (bloquear o pedido antes de cair). Pode ser uma 2ª fase se você quiser.
- Histórico/relatório de rupturas (já fica registrado em `stock_alerts`, mas sem tela de relatório agora).

Quer que eu siga assim ou prefere também **bloquear o pedido no checkout** quando o estoque é insuficiente (em vez de só avisar depois)?