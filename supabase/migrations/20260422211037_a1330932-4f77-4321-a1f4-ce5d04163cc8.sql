-- 1. Adicionar colunas em platform_config
ALTER TABLE public.platform_config
  ADD COLUMN IF NOT EXISTS admin_telegram_chat_id text,
  ADD COLUMN IF NOT EXISTS admin_telegram_events jsonb NOT NULL DEFAULT '{
    "new_signup": true,
    "subscription_change": true,
    "critical_error": true,
    "phantom_orders": true,
    "referral_converted": true,
    "subscription_expiring": true,
    "daily_digest": true,
    "weekly_digest": true
  }'::jsonb;

-- 2. Tabela de log/auditoria
CREATE TABLE IF NOT EXISTS public.admin_telegram_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  message text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_telegram_log_created
  ON public.admin_telegram_log (created_at DESC);

ALTER TABLE public.admin_telegram_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view telegram logs" ON public.admin_telegram_log;
CREATE POLICY "Admin can view telegram logs"
  ON public.admin_telegram_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages telegram logs" ON public.admin_telegram_log;
CREATE POLICY "Service role manages telegram logs"
  ON public.admin_telegram_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Função utilitária para chamar a edge function
CREATE OR REPLACE FUNCTION public.notify_admin_telegram(_event_type text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/admin-telegram-notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('event_type', _event_type, 'payload', _payload)
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca falhar a operação principal por causa do Telegram
  NULL;
END;
$$;

-- 4. Trigger: novo cadastro de organização
CREATE OR REPLACE FUNCTION public.trg_admin_notify_new_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.notify_admin_telegram(
    'new_signup',
    jsonb_build_object(
      'org_id', NEW.id,
      'org_name', NEW.name,
      'slug', NEW.slug,
      'plan', NEW.subscription_plan,
      'status', NEW.subscription_status,
      'whatsapp', NEW.whatsapp,
      'referred_by_id', NEW.referred_by_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_notify_new_org ON public.organizations;
CREATE TRIGGER admin_notify_new_org
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_admin_notify_new_org();

-- 5. Trigger: mudança de plano/assinatura
CREATE OR REPLACE FUNCTION public.trg_admin_notify_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan)
     OR (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
    PERFORM public.notify_admin_telegram(
      'subscription_change',
      jsonb_build_object(
        'org_id', NEW.id,
        'org_name', NEW.name,
        'old_plan', OLD.subscription_plan,
        'new_plan', NEW.subscription_plan,
        'old_status', OLD.subscription_status,
        'new_status', NEW.subscription_status,
        'billing_cycle', NEW.billing_cycle
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_notify_subscription_change ON public.organizations;
CREATE TRIGGER admin_notify_subscription_change
  AFTER UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_admin_notify_subscription_change();

-- 6. Trigger: indicação convertida (referral_bonuses INSERT)
CREATE OR REPLACE FUNCTION public.trg_admin_notify_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer_name text;
BEGIN
  SELECT name INTO _referrer_name FROM organizations WHERE id = NEW.referrer_org_id;
  PERFORM public.notify_admin_telegram(
    'referral_converted',
    jsonb_build_object(
      'referrer_org_id', NEW.referrer_org_id,
      'referrer_name', _referrer_name,
      'referred_org_id', NEW.referred_org_id,
      'referred_name', NEW.referred_org_name,
      'bonus_days', NEW.bonus_days
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_notify_referral ON public.referral_bonuses;
CREATE TRIGGER admin_notify_referral
  AFTER INSERT ON public.referral_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_admin_notify_referral();

-- 7. Trigger: erro crítico (filtrado por padrões reconhecidos)
CREATE OR REPLACE FUNCTION public.trg_admin_notify_critical_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_critical boolean := false;
  _msg text := COALESCE(NEW.error_message, '');
  _url text := COALESCE(NEW.url, '');
BEGIN
  -- Padrões críticos (alinhado com errorClassifier.ts)
  IF _url ~* 'checkout|placeOrder|payment|pix|mp-' THEN
    _is_critical := true;
  ELSIF _msg ~* 'placeOrder|payment failed|pix failed|mp_subscription' THEN
    _is_critical := true;
  ELSIF _url ~* 'printOrder|fila_impressao|printer' OR _msg ~* 'printOrder|fila_impressao' THEN
    _is_critical := true;
  END IF;

  IF _is_critical THEN
    PERFORM public.notify_admin_telegram(
      'critical_error',
      jsonb_build_object(
        'error_message', NEW.error_message,
        'url', NEW.url,
        'organization_id', NEW.organization_id,
        'source', NEW.source,
        'created_at', NEW.created_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_notify_critical_error ON public.client_error_logs;
CREATE TRIGGER admin_notify_critical_error
  AFTER INSERT ON public.client_error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_admin_notify_critical_error();
