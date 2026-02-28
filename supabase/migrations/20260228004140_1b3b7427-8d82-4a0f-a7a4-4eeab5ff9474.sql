
-- Add order_number column
ALTER TABLE public.orders ADD COLUMN order_number integer;

-- Backfill existing orders with sequential numbers per organization
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at) AS rn
  FROM public.orders
)
UPDATE public.orders SET order_number = numbered.rn FROM numbered WHERE public.orders.id = numbered.id;

-- Trigger function to auto-increment per organization
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO NEW.order_number
  FROM public.orders WHERE organization_id = NEW.organization_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_number();
