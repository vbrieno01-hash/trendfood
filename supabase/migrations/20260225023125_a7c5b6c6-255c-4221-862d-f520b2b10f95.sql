
-- Drop existing FK and recreate with ON DELETE SET NULL
ALTER TABLE public.deliveries DROP CONSTRAINT IF EXISTS deliveries_courier_id_fkey;
ALTER TABLE public.deliveries ADD CONSTRAINT deliveries_courier_id_fkey
  FOREIGN KEY (courier_id) REFERENCES public.couriers(id) ON DELETE SET NULL;

-- Same for courier_shifts
ALTER TABLE public.courier_shifts DROP CONSTRAINT IF EXISTS courier_shifts_courier_id_fkey;
