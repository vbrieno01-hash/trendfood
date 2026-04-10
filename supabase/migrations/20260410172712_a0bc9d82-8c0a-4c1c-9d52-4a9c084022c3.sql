
-- Table for customer push subscriptions linked to orders
CREATE TABLE public.customer_push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(endpoint, order_id)
);

ALTER TABLE public.customer_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public insert (anonymous customers)
CREATE POLICY "customer_push_insert_public" ON public.customer_push_subscriptions
  FOR INSERT TO public WITH CHECK (true);

-- Select for service role only (edge function uses service role)
CREATE POLICY "customer_push_select_admin" ON public.customer_push_subscriptions
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Delete expired/admin
CREATE POLICY "customer_push_delete_admin" ON public.customer_push_subscriptions
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger function to notify customer on status change
CREATE OR REPLACE FUNCTION public.notify_customer_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('preparing', 'ready', 'delivered')
  THEN
    PERFORM net.http_post(
      url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-customer-push',
      body := json_build_object(
        'order_id', NEW.id,
        'new_status', NEW.status,
        'order_number', NEW.order_number
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_customer_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_status_change();
