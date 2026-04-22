-- Atualizar trigger de subscription_change para incluir whatsapp e slug
CREATE OR REPLACE FUNCTION public.trg_admin_notify_subscription_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan)
     OR (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) THEN
    PERFORM public.notify_admin_telegram(
      'subscription_change',
      jsonb_build_object(
        'org_id', NEW.id,
        'org_name', NEW.name,
        'slug', NEW.slug,
        'whatsapp', NEW.whatsapp,
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
$function$;

-- Atualizar trigger de referral para incluir whatsapp e slug do indicador
CREATE OR REPLACE FUNCTION public.trg_admin_notify_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_name text;
  _referrer_whatsapp text;
  _referrer_slug text;
BEGIN
  SELECT name, whatsapp, slug
    INTO _referrer_name, _referrer_whatsapp, _referrer_slug
  FROM organizations WHERE id = NEW.referrer_org_id;

  PERFORM public.notify_admin_telegram(
    'referral_converted',
    jsonb_build_object(
      'referrer_org_id', NEW.referrer_org_id,
      'referrer_name', _referrer_name,
      'referrer_whatsapp', _referrer_whatsapp,
      'referrer_slug', _referrer_slug,
      'referred_org_id', NEW.referred_org_id,
      'referred_name', NEW.referred_org_name,
      'bonus_days', NEW.bonus_days
    )
  );
  RETURN NEW;
END;
$function$;