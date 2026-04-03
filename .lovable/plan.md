

## Plano: Completar Push Notifications (gerar chaves + código)

A tabela `push_subscriptions` e o trigger no banco já existem. Falta gerar as chaves VAPID, salvá-las nos secrets e criar todo o código.

### Etapas

| # | O que |
|---|-------|
| 1 | Gerar par VAPID via script Node.js e salvar `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` nos secrets do projeto |
| 2 | Criar edge function `supabase/functions/send-push-notification/index.ts` — recebe org_id + order_number, busca subscriptions, envia push via Web Push protocol (VAPID/ECDSA com crypto nativo do Deno) |
| 3 | Adicionar config no `supabase/config.toml` com `verify_jwt = false` para a edge function |
| 4 | Criar `public/sw-push.js` — service worker customizado com listeners `push` e `notificationclick` |
| 5 | Criar `src/hooks/usePushSubscription.ts` — pede permissão, registra SW, salva subscription no banco, retorna estado |
| 6 | Adicionar botão de sino no `HomeTab.tsx` para ativar/desativar notificações |

### Detalhes técnicos

**Edge Function**: Implementa o protocolo Web Push usando crypto nativo do Deno (ECDH P-256 + HKDF + AES-128-GCM) sem dependências externas. Busca subscriptions da org via service role key.

**Trigger existente** (`notify_new_order`): Usa `pg_net` para chamar a edge function. Precisa das variáveis `app.settings.supabase_url` e `app.settings.service_role_key` configuradas no banco — vou verificar e criar migração se necessário.

**Service Worker** (`sw-push.js`): Exibe notificação com título/corpo e abre o dashboard ao clicar.

**Hook** (`usePushSubscription`): Verifica suporte, pede permissão, registra subscription no PushManager com VAPID public key, faz upsert no banco.

**Botão no Dashboard**: Ícone de sino com indicador verde quando ativo, toggle para ativar/desativar.

### Resultado
- 2 secrets adicionados (VAPID keys)
- 1 edge function nova
- 1 config.toml editado
- 1 service worker novo
- 1 hook novo
- 1 componente editado (HomeTab)

