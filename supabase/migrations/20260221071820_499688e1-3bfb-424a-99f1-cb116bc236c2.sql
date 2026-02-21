
-- Tabela de motoboys
CREATE TABLE public.couriers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  plate text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couriers_select_public" ON public.couriers FOR SELECT USING (true);
CREATE POLICY "couriers_insert_public" ON public.couriers FOR INSERT WITH CHECK (true);
CREATE POLICY "couriers_update_owner" ON public.couriers FOR UPDATE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = couriers.organization_id));
CREATE POLICY "couriers_delete_owner" ON public.couriers FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = couriers.organization_id));

-- Tabela de entregas
CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  customer_address text NOT NULL,
  distance_km numeric,
  fee numeric,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  delivered_at timestamptz
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliveries_select_public" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "deliveries_insert_owner" ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = (SELECT user_id FROM organizations WHERE id = deliveries.organization_id));
CREATE POLICY "deliveries_insert_public" ON public.deliveries FOR INSERT WITH CHECK (true);
CREATE POLICY "deliveries_update_public" ON public.deliveries FOR UPDATE USING (true);
CREATE POLICY "deliveries_delete_owner" ON public.deliveries FOR DELETE
  USING (auth.uid() = (SELECT user_id FROM organizations WHERE id = deliveries.organization_id));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
