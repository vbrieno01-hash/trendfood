-- 1) REMOVER POLICIES PERIGOSAS
DROP POLICY IF EXISTS deliveries_select_public ON public.deliveries;
DROP POLICY IF EXISTS deliveries_update_operational ON public.deliveries;

-- 2) GARANTIR RLS
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 3) POLICY: dono da loja vê só suas entregas
DROP POLICY IF EXISTS deliveries_select_owner ON public.deliveries;
CREATE POLICY deliveries_select_owner ON public.deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = deliveries.organization_id AND o.user_id = auth.uid()
  ));

-- 4) POLICY: admin vê tudo
DROP POLICY IF EXISTS deliveries_select_admin ON public.deliveries;
CREATE POLICY deliveries_select_admin ON public.deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) RPC: lista pendentes (motoboy sem login)
CREATE OR REPLACE FUNCTION public.get_pending_deliveries(_org_id uuid)
RETURNS TABLE (id uuid, order_id uuid, customer_address text, fee numeric,
               distance_km numeric, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, order_id, customer_address, fee, distance_km, status, created_at
  FROM public.deliveries
  WHERE organization_id = _org_id AND status = 'pendente'
  ORDER BY created_at ASC;
$$;

-- 6) RPC: entregas em rota do motoboy
CREATE OR REPLACE FUNCTION public.get_my_deliveries(_courier_id uuid)
RETURNS TABLE (id uuid, order_id uuid, customer_address text, fee numeric,
               distance_km numeric, status text, accepted_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, order_id, customer_address, fee, distance_km, status, accepted_at, created_at
  FROM public.deliveries
  WHERE courier_id = _courier_id AND status = 'em_rota'
  ORDER BY accepted_at DESC;
$$;

-- 7) RPC: aceitar entrega (com hardening: row lock + idempotência)
CREATE OR REPLACE FUNCTION public.courier_accept_delivery(_delivery_id uuid, _courier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _org_id uuid;
  _delivery_org uuid;
BEGIN
  SELECT organization_id INTO _delivery_org
  FROM public.deliveries
  WHERE id = _delivery_id AND status = 'pendente'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega indisponível' USING ERRCODE = 'P0001';
  END IF;

  SELECT organization_id INTO _org_id
  FROM public.couriers
  WHERE id = _courier_id AND active = true;

  IF _org_id IS NULL OR _org_id <> _delivery_org THEN
    RAISE EXCEPTION 'Entrega indisponível' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.deliveries
     SET courier_id = _courier_id, status = 'em_rota', accepted_at = now()
   WHERE id = _delivery_id;
END; $$;

-- 8) RPC: completar entrega
CREATE OR REPLACE FUNCTION public.courier_complete_delivery(_delivery_id uuid, _courier_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.deliveries
     SET status = 'entregue', delivered_at = now()
   WHERE id = _delivery_id AND courier_id = _courier_id AND status = 'em_rota';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrega indisponível' USING ERRCODE = 'P0001';
  END IF;
END; $$;

-- 9) Grants restritos
REVOKE ALL ON FUNCTION public.get_pending_deliveries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_deliveries(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_my_deliveries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_deliveries(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.courier_accept_delivery(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_accept_delivery(uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.courier_complete_delivery(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.courier_complete_delivery(uuid, uuid) TO anon, authenticated;