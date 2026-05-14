CREATE OR REPLACE FUNCTION public.tg_orders_ifood_status_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ifood_order_id TEXT;
BEGIN
  IF NEW.gateway_payment_id IS NULL OR NEW.gateway_payment_id NOT LIKE 'ifood:%' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  _ifood_order_id := substring(NEW.gateway_payment_id from 7);

  PERFORM net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/ifood-update-status',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'order_id', NEW.id,
      'ifood_order_id', _ifood_order_id,
      'organization_id', NEW.organization_id,
      'new_status', NEW.status,
      'old_status', OLD.status,
      'cancellation_reason_code', NULLIF(NEW.cancellation_reason, ''),
      'cancellation_reason_description', NEW.cancellation_reason
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;