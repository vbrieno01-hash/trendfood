CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;