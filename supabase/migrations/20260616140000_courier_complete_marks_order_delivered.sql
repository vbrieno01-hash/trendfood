-- Update courier_complete_delivery to also mark the order as delivered
-- Runs as SECURITY DEFINER so it bypasses RLS regardless of courier auth state

CREATE OR REPLACE FUNCTION public.courier_complete_delivery(_delivery_id uuid, _courier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _order_id uuid;
BEGIN
  -- Mark delivery as delivered
  UPDATE public.deliveries
     SET status = 'entregue', delivered_at = now()
   WHERE id = _delivery_id AND courier_id = _courier_id AND status = 'em_rota'
   RETURNING order_id INTO _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega indisponível' USING ERRCODE = 'P0001';
  END IF;

  -- Automatically mark the order as delivered in the store panel
  IF _order_id IS NOT NULL THEN
    UPDATE public.orders
       SET status = 'delivered'
     WHERE id = _order_id AND status = 'ready';
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.courier_complete_delivery(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_complete_delivery(uuid, uuid) TO anon, authenticated;
