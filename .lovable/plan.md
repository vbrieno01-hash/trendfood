

## Plano: Salvar chaves VAPID + implementar push notifications completo

As chaves VAPID já foram geradas:
- **Pública**: `BBATtReMYYfX0TzAWOBYZkVAZlvUZlQJGI-YRtlqpPRo3Y0enwYdArCVl4R1TzyoeJuPD8gbSlKippNGaim-6QM`
- **Privada**: `8kLagAPawdpPp3WU6PFkCp1c__DMwhybPDD3VHlrqVw`

### Etapas

| # | O que |
|---|-------|
| 1 | Salvar `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` nos secrets do projeto (automático, sem ação sua) |
| 2 | Criar edge function `send-push-notification/index.ts` — busca subscriptions e envia push via Web Push protocol com VAPID |
| 3 | Adicionar config `verify_jwt = false` no `config.toml` |
| 4 | Migração para configurar `app.settings.supabase_url` e `app.settings.service_role_key` no banco (necessário para o trigger funcionar) |
| 5 | Criar `public/sw-push.js` — service worker com listeners `push` e `notificationclick` |
| 6 | Criar `src/hooks/usePushSubscription.ts` — pede permissão, registra SW, salva no banco |
| 7 | Adicionar botão de sino no `HomeTab.tsx` para ativar/desativar notificações |

### Detalhes técnicos

**Edge Function** (`send-push-notification`):
- Recebe `{ organization_id, order_number }` do trigger
- Busca todas subscriptions da org via service role key
- Implementa Web Push protocol com ECDSA P-256 + HKDF + AES-128-GCM usando crypto nativo do Deno
- Envia para cada endpoint registrado

**Service Worker** (`sw-push.js`):
- Evento `push`: mostra notificação com título e corpo
- Evento `notificationclick`: abre o dashboard

**Hook** (`usePushSubscription`):
- Verifica suporte (`PushManager` + `serviceWorker`)
- Pede `Notification.requestPermission()`
- Registra subscription com `applicationServerKey` (VAPID public)
- Upsert no banco `push_subscriptions`

**Botão no Dashboard**:
- Ícone de sino com indicador verde quando ativo
- Toggle: ativa → pede permissão e salva; desativa → remove do banco

### Resultado
- 2 secrets salvos automaticamente
- 1 edge function nova
- 1 config.toml editado
- 1 service worker novo
- 1 hook novo
- 1 componente editado (HomeTab)
- 0 migrações adicionais (tabela e trigger já existem)

