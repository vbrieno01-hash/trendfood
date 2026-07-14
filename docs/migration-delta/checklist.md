# Checklist — Sincronização do espelho `eqyklkrigshbjuneuxrz`

Marque conforme for aplicando. Zero impacto no Lovable Cloud.

## Schema
- [ ] Logado no projeto **eqyklkrigshbjuneuxrz** no Supabase Studio
- [ ] Backup rápido (opcional): `pg_dump` via Studio → Database → Backups
- [ ] Colar `schema-delta.sql` no SQL Editor e clicar **Run**
- [ ] Confirmar sem erros críticos (mensagens "already exists" são ok)

## Storage
- [ ] Bucket `support-attachments` criado (privado)
- [ ] 3 policies coladas no SQL Editor
- [ ] Buckets `logos`, `menu-images`, `guides`, `campaign-media` conferidos

## Edge Functions
Mínimo obrigatório:
- [ ] `campaign-check-numbers`
- [ ] `campaign-create-manual`
- [ ] `campaign-send-test`
- [ ] `create-campaign-pix`
- [ ] `watchdog-pix-stuck`
- [ ] `whatsapp-cleanup-expired`
- [ ] `whatsapp-outbox-dispatch`
- [ ] `whatsapp-queue`
- [ ] `whatsapp-send-auto`
- [ ] `whatsapp-webhook`
- [ ] `reconcile-pending-pix`
- [ ] `uazapi-notify-owner`
- [ ] `check-addon-pix`
- [ ] `check-pix-status`
- [ ] `mp-webhook`

Ideal (todas as 86):
- [ ] Redeploy completo de `supabase/functions/*`

## Secrets no espelho
- [ ] `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`
- [ ] `UAZAPI_TOKEN`, `UAZAPI_URL`
- [ ] `TELEGRAM_BOT_TOKEN` (admin + afiliados)
- [ ] `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- [ ] `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`
- [ ] `CAKTO_WEBHOOK_SECRET`

## Smoke test
- [ ] `SELECT count(*) FROM public.campaigns;` retorna número
- [ ] `SELECT count(*) FROM public.support_conversations;` retorna número
- [ ] `SELECT * FROM public.wa_enqueue_status LIMIT 1;` (função existe)
- [ ] Bucket `support-attachments` aparece em Storage

## Depois
- [ ] Guardar este checklist datado
- [ ] Anotar próxima data de re-sync (semanal recomendado)
