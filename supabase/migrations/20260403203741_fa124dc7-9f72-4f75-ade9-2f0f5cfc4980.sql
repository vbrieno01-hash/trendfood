
-- Tabela push_subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_select_own" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subs_delete_own" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "push_subs_select_admin" ON public.push_subscriptions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "push_subs_select_org_owner" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = (SELECT o.user_id FROM organizations o WHERE o.id = push_subscriptions.organization_id));

CREATE POLICY "push_subs_delete_org_owner" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = (SELECT o.user_id FROM organizations o WHERE o.id = push_subscriptions.organization_id));

-- Habilitar extensão pg_net (necessária para HTTP requests do trigger)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função do trigger
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM extensions.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
      body := json_build_object(
        'organization_id', NEW.organization_id,
        'order_number', NEW.order_number
      )::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger na tabela orders
CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_order();
