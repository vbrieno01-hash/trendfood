# Edge Functions — Delta desde 2026-07-09

O dump `.backup` não contém código de edge functions (elas vivem fora do
banco). Não dá pra saber com 100% de certeza quais mudaram olhando só o dump.

## Recomendação: redeployar TODAS

Mais seguro e rápido. São 86 functions no repo. Cada uma:

1. Abrir `supabase/functions/<nome>/index.ts` no editor do Lovable
2. Copiar o conteúdo inteiro
3. No Studio do espelho: **Edge Functions → New / Update function → paste → Deploy**

## Mínimo obrigatório (as que sabemos que mudaram/são novas)

Se quiser fazer só o essencial primeiro:

### Novas (criadas depois de 09/07)
- `campaign-check-numbers`
- `campaign-create-manual`
- `campaign-send-test`
- `create-campaign-pix`
- `watchdog-pix-stuck`
- `whatsapp-cleanup-expired`
- `whatsapp-outbox-dispatch`
- `whatsapp-queue`
- `whatsapp-send-auto`
- `whatsapp-webhook`

### Alteradas (fixes importantes)
- `reconcile-pending-pix` — fix: não sobrescreve `subscription_plan`
- `uazapi-notify-owner` — fix: total do pedido inclui taxa de entrega
- `check-addon-pix` / `check-pix-status` — polling de PIX robusto
- `mp-webhook` — reconciliação de addons

### Já existiam mas seguras pra re-deploy
Todas as outras 70. Não custa nada re-deployar.

## Lista completa (86)

- admin-telegram-digest
- admin-telegram-notify
- admin-telegram-watchdog
- affiliate-auto-choose
- affiliate-create-goal-manual
- affiliate-monthly-payout
- ai-bot-respond
- campaign-check-numbers
- campaign-create-manual
- campaign-send-test
- cancel-mp-subscription
- check-addon-pix
- check-pix-status
- check-subscription-pix
- cleanup-broken-banners
- cleanup-orphan-storage
- cleanup-phantom-orders
- create-addon-pix
- create-addon-subscription
- create-admin-user
- create-campaign-pix
- create-mp-payment
- create-mp-subscription
- fiscal-auto-emit-trigger
- fiscal-cancel-nfce
- fiscal-consult-cron
- fiscal-consult-nfce
- fiscal-econf
- fiscal-emit-nfce
- fiscal-focus-setup
- fiscal-focus-webhook
- fiscal-inutilize-range
- fiscal-send-email
- fiscal-upload-certificate
- generate-pix-payload
- geocode-distance
- get-client-ip
- get-mp-public-key
- get-subscription-details
- ifood-auth
- ifood-cancel-order
- ifood-cancellation-reasons
- ifood-handle-cancellation
- ifood-handshake-respond
- ifood-merchant-api
- ifood-orphan-sweeper
- ifood-poll-events
- ifood-reprocess-orphans
- ifood-tracking
- ifood-update-platform-creds
- ifood-update-status
- ifood-validate-pickup-code
- ifood-verify-delivery-code
- ifood-webhook
- mp-webhook
- notify-affiliate-telegram
- notify-merchant-telegram
- printer-queue
- process-wa-outbox
- reclame-aqui-send
- reconcile-pending-pix
- referral-cron-watchdog
- release-affiliate-commissions
- reverse-geocode
- sales-chat
- send-customer-push
- send-push-notification
- telegram-affiliate-webhook
- telegram-automations
- test-telegram
- transfer-org-owner
- uazapi-create-instance
- uazapi-disconnect
- uazapi-instance-status
- uazapi-notify-customer
- uazapi-notify-owner
- uazapi-server-info
- universal-activation-webhook
- verify-pix-payment
- viacep-proxy
- watchdog-pix-stuck
- whatsapp-cleanup-expired
- whatsapp-outbox-dispatch
- whatsapp-queue
- whatsapp-send-auto
- whatsapp-webhook
