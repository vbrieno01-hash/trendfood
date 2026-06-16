-- Fix old deliveries where fee was incorrectly set to 0
-- because the code was using the customer's frete (Grátis) as the courier fee.
--
-- Logic:
--   If delivery has distance_km → fee = base_fee + (distance_km * per_km)
--   If delivery has no distance_km → fee = base_fee (minimum per delivery)
--
-- Only touches deliveries where fee = 0 to avoid overwriting manually set values.

UPDATE public.deliveries d
SET fee = CASE
  WHEN d.distance_km IS NOT NULL AND d.distance_km > 0 THEN
    ROUND(
      CAST(
        COALESCE((o.courier_config->>'base_fee')::numeric, 3.0)
        + (d.distance_km * COALESCE((o.courier_config->>'per_km')::numeric, 2.5))
      AS numeric),
    2)
  ELSE
    COALESCE((o.courier_config->>'base_fee')::numeric, 3.0)
END
FROM public.organizations o
WHERE d.organization_id = o.id
  AND (d.fee = 0 OR d.fee IS NULL)
  AND d.status IN ('entregue', 'em_rota', 'pendente');
