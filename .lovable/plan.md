

## Plano: Gerar e salvar chaves VAPID + implementar push notifications

As chaves VAPID são geradas automaticamente — você não precisa buscá-las em nenhum serviço externo. Eu gero o par de chaves (pública/privada) e salvo nos secrets do projeto.

### Etapas

| # | O que |
|---|-------|
| 1 | Gerar par de chaves VAPID via script (crypto ECDH prime256v1) |
| 2 | Salvar `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` nos secrets |
| 3 | Criar tabela `push_subscriptions` no banco com RLS |
| 4 | Criar trigger na tabela `orders` para chamar edge function via pg_net |
| 5 | Criar edge function `send-push-notification` |
| 6 | Criar service worker `public/sw-push.js` |
| 7 | Criar hook `usePushSubscription.ts` |
| 8 | Adicionar botão de notificações no Dashboard |

### Importante
- As chaves são gratuitas e geradas internamente
- Você **não precisa preencher nada manualmente** — eu cuido disso
- Feche o diálogo de secrets e aprove este plano para eu continuar

