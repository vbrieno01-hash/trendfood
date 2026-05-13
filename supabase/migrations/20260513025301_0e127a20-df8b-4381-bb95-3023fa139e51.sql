-- 1) Leitura pública da loja: cobre anon E authenticated (antes era só anon)
DROP POLICY IF EXISTS public_can_view_basic_org_info ON public.organizations;

CREATE POLICY public_can_view_basic_org_info
ON public.organizations
FOR SELECT
TO anon, authenticated
USING (true);

-- 2) Update de distance_km: cobre anon E authenticated (checkout pode rodar logado)
DROP POLICY IF EXISTS deliveries_update_distance_anon ON public.deliveries;

CREATE POLICY deliveries_update_distance_public
ON public.deliveries
FOR UPDATE
TO anon, authenticated
USING (courier_id IS NULL AND status = 'pendente')
WITH CHECK (courier_id IS NULL AND status = 'pendente');