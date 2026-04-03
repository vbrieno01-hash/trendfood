-- Atualizar função do trigger para usar URL e anon key diretamente
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM extensions.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::text,
      headers := json_build_object(
        'Content-Type', 'application/json'
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recriar trigger caso não exista
DROP TRIGGER IF EXISTS trg_notify_new_order ON public.orders;
CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();
