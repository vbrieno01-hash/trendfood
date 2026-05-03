CREATE OR REPLACE FUNCTION public.notify_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'pending' THEN
    -- Web push (navegador)
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::jsonb
    );

    -- Telegram do lojista (fluxo isolado, independente do push)
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/notify-merchant-telegram',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;