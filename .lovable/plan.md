

## Plano: Notificações Push via PWA

### Visão geral
Quando um cliente faz um pedido, o lojista recebe uma notificação push no celular/desktop — mesmo com o navegador minimizado. Usa a Push API nativa do navegador com chaves VAPID (gratuito, sem custo).

### Arquitetura

```text
Cliente faz pedido
  → INSERT na tabela orders
  → Trigger no banco chama pg_net para invocar Edge Function
  → Edge Function "send-push-notification" busca tokens do org_id
  → Envia push via web-push (VAPID) para cada token
  → Service Worker do lojista exibe a notificação
```

### Mudanças

| # | Tipo | O que |
|---|------|-------|
| 1 | Migração | Criar tabela `push_subscriptions` (org_id, user_id, endpoint, p256dh, auth, created_at) com RLS |
| 2 | Migração | Criar trigger na tabela `orders` que chama pg_net HTTP POST para a edge function ao inserir pedido |
| 3 | Edge Function | `send-push-notification` — recebe org_id + order info, busca subscriptions, envia via web-push |
| 4 | Secrets | Gerar par VAPID (público/privado) e salvar como secrets `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` |
| 5 | Hook | `usePushSubscription.ts` — pede permissão, registra subscription no banco, salva endpoint/keys |
| 6 | Dashboard | Adicionar botão "Ativar notificações" no DashboardPage (ou HomeTab) que chama o hook |
| 7 | Service Worker | Adicionar listener `push` e `notificationclick` no SW customizado |

### Detalhes técnicos

**Tabela `push_subscriptions`:**
- `id`, `organization_id`, `user_id`, `endpoint` (text, unique), `p256dh` (text), `auth` (text), `created_at`
- RLS: owner pode INSERT/SELECT/DELETE own, admin pode SELECT all

**Trigger no banco (orders INSERT):**
- Usa `pg_net` para fazer HTTP POST para a edge function com `organization_id` e `order_number`
- Só dispara quando `status = 'pending'`

**Edge Function `send-push-notification`:**
- Busca todas as subscriptions da org
- Usa biblioteca `web-push` (npm) com VAPID keys dos secrets
- Envia payload: `{ title: "Novo pedido!", body: "Pedido #123 recebido" }`

**Service Worker customizado:**
- Arquivo `public/sw-push.js` com listeners `push` e `notificationclick`
- O `notificationclick` abre o dashboard

**Hook `usePushSubscription`:**
- Verifica suporte (`'PushManager' in window`)
- Pede `Notification.requestPermission()`
- Registra no `serviceWorker` com `applicationServerKey` (VAPID public)
- Salva endpoint + keys no banco

**Botão no Dashboard:**
- Ícone de sino com estado (ativo/inativo)
- Ao clicar: pede permissão → registra → salva
- Se já registrado, mostra "Notificações ativas ✓"

### Resultado
- 1 edge function nova
- 2 migrações (tabela + trigger)
- 2 secrets (VAPID keys)
- 1 arquivo SW novo
- 1 hook novo
- 1 componente editado (Dashboard)
- Lojista recebe push em tempo real quando pedido chega

