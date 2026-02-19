ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['pending', 'preparing', 'ready', 'delivered', 'awaiting_payment']));