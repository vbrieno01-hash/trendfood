
ALTER TABLE public.ifood_credentials
  ADD COLUMN IF NOT EXISTS last_polled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merchant_name TEXT;

CREATE TABLE IF NOT EXISTS public.ifood_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  ifood_event_id TEXT,
  ifood_order_id TEXT,
  ifood_display_id TEXT,
  code TEXT NOT NULL,
  payload JSONB,
  internal_order_id UUID,
  source TEXT NOT NULL DEFAULT 'webhook',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ifood_event_log_org_idx
  ON public.ifood_event_log (organization_id, received_at DESC);

ALTER TABLE public.ifood_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ifood_event_log_select_admin ON public.ifood_event_log
  FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY ifood_event_log_select_owner ON public.ifood_event_log
  FOR SELECT TO public USING (
    auth.uid() = (SELECT user_id FROM public.organizations WHERE id = ifood_event_log.organization_id)
  );
CREATE POLICY ifood_event_log_insert_service ON public.ifood_event_log
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY ifood_event_log_delete_admin ON public.ifood_event_log
  FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.menu_items     ADD COLUMN IF NOT EXISTS ifood_id TEXT;
ALTER TABLE public.global_addons  ADD COLUMN IF NOT EXISTS ifood_option_id TEXT;
ALTER TABLE public.global_addons  ADD COLUMN IF NOT EXISTS ifood_group_id  TEXT;

CREATE TABLE IF NOT EXISTS public.ifood_category_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  ifood_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category_name)
);

ALTER TABLE public.ifood_category_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY ifood_category_map_all_owner ON public.ifood_category_map
  FOR ALL TO public
  USING (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = ifood_category_map.organization_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.organizations WHERE id = ifood_category_map.organization_id));

CREATE POLICY ifood_category_map_admin ON public.ifood_category_map
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ifood_category_map_insert_service ON public.ifood_category_map
  FOR INSERT TO public WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_orders_ifood_status_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      'old_status', OLD.status
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_ifood_status_sync ON public.orders;
CREATE TRIGGER trg_orders_ifood_status_sync
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_orders_ifood_status_sync();
