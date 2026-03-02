import { useState, useEffect, useRef } from "react";
import { Organization } from "@/hooks/useOrganization";
import { calculateDistanceViaEdge } from "@/lib/geocode";

export interface DeliveryConfig {
  fee_1km: number;
  fee_2km: number;
  fee_3km: number;
  fee_4km: number;
  fee_5km: number;
  free_above: number;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  fee_1km: 3,
  fee_2km: 5,
  fee_3km: 7,
  fee_4km: 10,
  fee_5km: 12,
  free_above: 100,
};

interface UseDeliveryFeeResult {
  fee: number;
  freeShipping: boolean;
  loading: boolean;
  error: string | null;
  distanceKm: number | null;
  noStoreAddress: boolean;
}

function applyFeeTable(distanceKm: number, subtotal: number, config: DeliveryConfig): { fee: number; freeShipping: boolean } {
  if (subtotal >= config.free_above) return { fee: 0, freeShipping: true };
  const bucket = Math.ceil(distanceKm);
  if (bucket <= 1) return { fee: config.fee_1km, freeShipping: false };
  if (bucket <= 2) return { fee: config.fee_2km, freeShipping: false };
  if (bucket <= 3) return { fee: config.fee_3km, freeShipping: false };
  if (bucket <= 4) return { fee: config.fee_4km, freeShipping: false };
  return { fee: config.fee_5km, freeShipping: false };
}

export function useDeliveryFee(
  customerAddress: string,
  subtotal: number,
  org: Organization | null | undefined,
  enabled: boolean
): UseDeliveryFeeResult {
  const [fee, setFee] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeAddress = (org as { store_address?: string | null })?.store_address;
  const config: DeliveryConfig = {
    ...DEFAULT_DELIVERY_CONFIG,
    ...((org as { delivery_config?: DeliveryConfig | null })?.delivery_config ?? {}),
  };

  const noStoreAddress = !storeAddress;

  useEffect(() => {
    if (!enabled) {
      setFee(0);
      setFreeShipping(false);
      setLoading(false);
      setError(null);
      setDistanceKm(null);
      return;
    }

    if (!storeAddress || !customerAddress.trim() || customerAddress.trim().length < 8) {
      setFee(0);
      setFreeShipping(false);
      setDistanceKm(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await calculateDistanceViaEdge(storeAddress, customerAddress);

        if (result.error === "store_address_not_found") {
          throw new Error("Endereço da loja não encontrado");
        }
        if (result.error === "customer_address_not_found") {
          throw new Error("Endereço do cliente não encontrado");
        }
        if (result.error === "identical_coordinates" || result.distance_km === null) {
          // Coordenadas idênticas — usa taxa mínima
          setDistanceKm(0);
          const feeResult = applyFeeTable(0, subtotal, config);
          setFee(feeResult.fee);
          setFreeShipping(feeResult.freeShipping);
          return;
        }

        const km = result.distance_km;
        const feeResult = applyFeeTable(km, subtotal, config);
        setDistanceKm(km);
        setFee(feeResult.fee);
        setFreeShipping(feeResult.freeShipping);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao calcular frete");
        setFee(0);
        setFreeShipping(false);
        setDistanceKm(null);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerAddress, subtotal, storeAddress, enabled]);

  return { fee, freeShipping, loading, error, distanceKm, noStoreAddress };
}
