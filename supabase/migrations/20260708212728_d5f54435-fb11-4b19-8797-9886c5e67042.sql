
-- ─────────────────────────────────────────────────────────────
-- Addon expiration sweep + 3-day warning (ai_bot only)
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1) Expiration sweep: mark expired addons
CREATE OR REPLACE FUNCTION public.sweep_ai_bot_addons()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  WITH updated AS (
    UPDATE public.org_addons
       SET status = 'expired',
           updated_at = now()
     WHERE addon_key = 'ai_bot'
       AND status = 'active'
       AND current_period_end IS NOT NULL
       AND current_period_end <= now()
    RETURNING id, organization_id, current_period_end
  )
  SELECT count(*) INTO affected FROM updated;

  IF affected > 0 THEN
    INSERT INTO public.activation_logs
      (organization_id, org_name, old_plan, new_plan, old_status, new_status, source, notes)
    SELECT oa.organization_id,
           o.name,
           NULL, NULL, 'active', 'expired',
           'addon-expiration-sweep',
           'Addon ai_bot marcado como expirado (period_end ' || to_char(oa.current_period_end, 'YYYY-MM-DD') || ')'
      FROM public.org_addons oa
      LEFT JOIN public.organizations o ON o.id = oa.organization_id
     WHERE oa.addon_key = 'ai_bot'
       AND oa.status = 'expired'
       AND oa.updated_at >= now() - interval '2 minutes';
  END IF;

  RETURN affected;
END;
$$;

-- 2) Send 3-day warning via whatsapp_outbox (deduped by activation_logs)
CREATE OR REPLACE FUNCTION public.notify_ai_bot_expiring()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  days_left integer;
  msg text;
  sent_count integer := 0;
BEGIN
  FOR rec IN
    SELECT oa.organization_id,
           oa.current_period_end,
           o.name AS org_name,
           o.whatsapp AS owner_phone
      FROM public.org_addons oa
      JOIN public.organizations o ON o.id = oa.organization_id
     WHERE oa.addon_key = 'ai_bot'
       AND oa.status = 'active'
       AND oa.current_period_end IS NOT NULL
       AND oa.current_period_end BETWEEN now() AND now() + interval '3 days'
       AND o.whatsapp IS NOT NULL
       AND length(regexp_replace(o.whatsapp, '\D', '', 'g')) >= 10
       AND NOT EXISTS (
         SELECT 1 FROM public.activation_logs al
          WHERE al.organization_id = oa.organization_id
            AND al.source = 'addon-warning-3d'
            AND al.created_at >= now() - interval '3 days'
       )
  LOOP
    days_left := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (rec.current_period_end - now())) / 86400.0)::integer);

    msg :=
      E'👋 Oi! Aqui é o Breno da TrendFood.\n\n' ||
      'O robô do WhatsApp da tua loja vence em ' || days_left ||
      CASE WHEN days_left = 1 THEN ' dia.' ELSE ' dias.' END || E'\n' ||
      E'Se não pagar o PIX de R$ 50, o robô para de responder teus clientes automaticamente.\n\n' ||
      E'Paga rapidão no painel → Assinatura → Robô WhatsApp.\n' ||
      'Qualquer coisa me chama: +55 16 98808-3263.';

    INSERT INTO public.whatsapp_outbox
      (organization_id, phone, message, event_type, status)
    VALUES
      (rec.organization_id,
       regexp_replace(rec.owner_phone, '\D', '', 'g'),
       msg,
       'addon_ai_bot_warning',
       'pending');

    INSERT INTO public.activation_logs
      (organization_id, org_name, old_plan, new_plan, old_status, new_status, source, notes)
    VALUES
      (rec.organization_id, rec.org_name, NULL, NULL, 'active', 'active',
       'addon-warning-3d',
       'Aviso 3d enviado (vence em ' || days_left || 'd, ' || to_char(rec.current_period_end, 'YYYY-MM-DD') || ')');

    sent_count := sent_count + 1;
  END LOOP;

  RETURN sent_count;
END;
$$;

-- 3) Schedule daily cron at 03:00 UTC
DO $$
BEGIN
  PERFORM cron.unschedule('addon-expiration-sweep');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'addon-expiration-sweep',
  '0 3 * * *',
  $$
    SELECT public.sweep_ai_bot_addons();
    SELECT public.notify_ai_bot_expiring();
  $$
);
