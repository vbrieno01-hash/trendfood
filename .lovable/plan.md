

## Plano: Implementar Notificações Push Completas

### Resumo
Salvar chaves VAPID, criar tabela `push_subscriptions`, edge function para envio, trigger no banco, service worker customizado e botão no dashboard.

### Etapas

| # | Tipo | O que |
|---|------|-------|
| 1 | Secrets | Salvar `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (já geradas) |
| 2 | Migração | Criar tabela `push_subscriptions` (organization_id, user_id, endpoint, p256dh, auth) com RLS + unique on endpoint |
| 3 | Edge Function | `send-push-notification/index.ts` — recebe org_id + order info, busca subscriptions, envia via web-push VAPID |
| 4 | Migração | Trigger na tabela `orders` que usa `pg_net` para chamar a edge function ao inserir pedido com status='pending' |
| 5 | Service Worker | `public/sw-push.js` com listeners `push` e `notificationclick` |
| 6 | Hook | `src/hooks/usePushSubscription.ts` — pede permissão, registra SW, salva subscription no banco |
| 7 | Dashboard | Botão de sino no `HomeTab.tsx` para ativar/desativar notificações |

### Detalhes técnicos

**Tabela `push_subscriptions`:**
- `id uuid PK`, `organization_id uuid`, `user_id uuid`, `endpoint text UNIQUE`, `p256dh text`, `auth text`, `created_at timestamptz`
- RLS: owner INSERT/SELECT/DELETE own subs, admin SELECT all

**Edge Function `send-push-notification`:**
- Cria cliente Supabase com service role key
- Busca todas subscriptions da org
- Usa crypto nativo do Deno para VAPID + web-push protocol (sem npm)
- Payload: `{ title: "Novo pedido!", body: "Pedido #N recebido", data: { url: "/painel" } }`

**Trigger (pg_net):**
- `AFTER INSERT ON orders` quando `NEW.status = 'pending'`
- POST para `{SUPABASE_URL}/functions/v1/send-push-notification` com `{ organization_id, order_number }`

**Service Worker (`sw-push.js`):**
- `push` → `self.registration.showNotification()`
- `notificationclick` → `clients.openWindow(data.url || '/')`

**Hook `usePushSubscription`:**
- Verifica `'PushManager' in window` e `'serviceWorker' in navigator`
- `Notification.requestPermission()` → registra SW → `subscribe({ applicationServerKey })` → upsert no banco
- Retorna `{ isSubscribed, subscribe, unsubscribe, isSupported }`

**Botão no Dashboard:**
- Ícone de sino com badge verde quando ativo
- Toggle: ativa → pede permissão e salva; desativa → remove do banco

### Resultado
- 2 secrets, 2 migrações, 1 edge function, 1 SW, 1 hook, 1 componente editado

