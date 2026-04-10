

## Notificações Push para Status do Pedido (Cliente)

### Desafio principal
Os clientes são **anônimos** (não fazem login). O sistema atual de push só funciona para o dono da loja (autenticado). Precisamos de uma abordagem diferente.

### Solução
Registrar uma inscrição push vinculada ao **order_id** no momento em que o cliente faz o pedido, e disparar notificações automáticas quando o status do pedido mudar.

### Fluxo
```text
Cliente faz pedido → Browser pede permissão push → Salva subscription vinculada ao order_id
→ Dono muda status (aceito/pronto/entrega) → DB trigger → Edge function
→ Push notification chega no celular do cliente
```

### Alterações

1. **Migração: tabela `customer_push_subscriptions`**
   - `id`, `order_id`, `endpoint`, `p256dh`, `auth`, `created_at`
   - RLS: INSERT público (cliente anônimo), SELECT/DELETE via service role
   - Sem vínculo com user_id

2. **Nova Edge Function: `send-customer-push`**
   - Recebe `order_id`, `new_status`, `order_number`
   - Busca subscription na tabela `customer_push_subscriptions`
   - Monta mensagem baseada no status:
     - `preparing` → "Pedido aceito! Estamos preparando..."
     - `ready` → "Pedido pronto! Venha retirar" ou "Saiu para entrega"
     - `delivered` → "Pedido entregue! Bom apetite"
   - Envia push usando VAPID (mesma lógica do `send-push-notification`)
   - Remove subscriptions expiradas (410/404)

3. **DB Trigger: `notify_customer_status_change`**
   - Dispara quando `orders.status` muda de valor
   - Chama a edge function `send-customer-push` via `net.http_post`
   - Só dispara para status: `preparing`, `ready`, `delivered`

4. **Frontend: `src/hooks/useCustomerPush.ts`**
   - Hook que registra push subscription do cliente após fazer o pedido
   - Usa o mesmo Service Worker (`sw-push.js`) já existente
   - Pede permissão de notificação no momento do checkout

5. **Frontend: `src/pages/UnitPage.tsx`**
   - Após o pedido ser criado com sucesso, chamar o hook para registrar a subscription push vinculada ao `order_id`
   - Mostrar um prompt amigável pedindo permissão de notificações

### Mensagens por status
| Status | Título | Corpo |
|--------|--------|-------|
| preparing | 🍳 Pedido aceito! | Seu pedido #X está sendo preparado |
| ready | ✅ Pedido pronto! | Retire seu pedido #X / Saiu para entrega |
| delivered | 🎉 Entregue! | Bom apetite! Avalie seu pedido |

### Arquivos
- Nova migração SQL (tabela + trigger)
- `supabase/functions/send-customer-push/index.ts` (nova)
- `src/hooks/useCustomerPush.ts` (novo)
- `src/pages/UnitPage.tsx` (integrar push após pedido)

### Segurança
- Subscription vinculada apenas ao order_id, sem dados pessoais
- Edge function usa service role para acessar subscriptions
- Subscriptions são removidas automaticamente quando expiram

