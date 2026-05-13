
CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID,
  order_number INTEGER,
  stock_item_id UUID,
  stock_item_name TEXT NOT NULL,
  menu_item_name TEXT,
  requested_qty NUMERIC NOT NULL DEFAULT 0,
  available_qty NUMERIC NOT NULL DEFAULT 0,
  shortage NUMERIC NOT NULL DEFAULT 0,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_stock_alerts_org_pending
  ON public.stock_alerts (organization_id, acknowledged, created_at DESC);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_alerts_select_owner"
ON public.stock_alerts FOR SELECT
USING (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = stock_alerts.organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "stock_alerts_update_owner"
ON public.stock_alerts FOR UPDATE
USING (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = stock_alerts.organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "stock_alerts_delete_owner"
ON public.stock_alerts FOR DELETE
USING (
  auth.uid() = (SELECT user_id FROM public.organizations WHERE id = stock_alerts.organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

ALTER TABLE public.stock_alerts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;

CREATE OR REPLACE FUNCTION public.deduct_stock_and_disable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _item RECORD;
  _ingredient RECORD;
  _new_qty NUMERIC;
  _stock RECORD;
  _menu_name TEXT;
  _needed NUMERIC;
BEGIN
  IF NEW.paid = true AND OLD.paid = false THEN
    FOR _item IN
      SELECT oi.menu_item_id, oi.quantity, mi.name AS menu_name
      FROM order_items oi
      LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = NEW.id
        AND oi.menu_item_id IS NOT NULL
    LOOP
      _menu_name := _item.menu_name;

      FOR _ingredient IN
        SELECT mii.stock_item_id, mii.quantity_used
        FROM menu_item_ingredients mii
        WHERE mii.menu_item_id = _item.menu_item_id
      LOOP
        _needed := _ingredient.quantity_used * _item.quantity;

        SELECT id, name, quantity INTO _stock
        FROM stock_items
        WHERE id = _ingredient.stock_item_id;

        IF _stock.id IS NOT NULL AND _needed > _stock.quantity THEN
          INSERT INTO stock_alerts (
            organization_id, order_id, order_number,
            stock_item_id, stock_item_name, menu_item_name,
            requested_qty, available_qty, shortage
          ) VALUES (
            NEW.organization_id, NEW.id, NEW.order_number,
            _stock.id, _stock.name, _menu_name,
            _needed, GREATEST(_stock.quantity, 0), _needed - _stock.quantity
          );
        END IF;

        UPDATE stock_items
        SET quantity = quantity - _needed
        WHERE id = _ingredient.stock_item_id;

        SELECT quantity INTO _new_qty
        FROM stock_items WHERE id = _ingredient.stock_item_id;

        IF _new_qty <= 0 THEN
          UPDATE menu_items
          SET available = false
          WHERE id IN (
            SELECT mii2.menu_item_id
            FROM menu_item_ingredients mii2
            WHERE mii2.stock_item_id = _ingredient.stock_item_id
          );
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_stock_shortage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'event_type', 'stock_shortage',
      'stock_item_name', NEW.stock_item_name,
      'menu_item_name', NEW.menu_item_name,
      'shortage', NEW.shortage,
      'order_number', NEW.order_number
    )
  );
  PERFORM net.http_post(
    url := 'https://xrzudhylpphnzousilye.supabase.co/functions/v1/notify-merchant-telegram',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'event_type', 'stock_shortage',
      'stock_item_name', NEW.stock_item_name,
      'menu_item_name', NEW.menu_item_name,
      'shortage', NEW.shortage,
      'order_number', NEW.order_number
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_notify_stock_shortage
AFTER INSERT ON public.stock_alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_stock_shortage();
