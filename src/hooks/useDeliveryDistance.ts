import { useState, useEffect, useRef } from "react";
import { geocodeAddress, getRouteDistanceKm, type GeoCoord } from "@/lib/geocode";

export type { GeoCoord };

export interface CourierConfig {
  base_fee: number;
  per_km: number;
  daily_rate?: number;
}

export const DEFAULT_COURIER_CONFIG: CourierConfig = { base_fee: 3.0, per_km: 2.5, daily_rate: 0 };

export function calculateCourierFee(distanceKm: number, config?: CourierConfig): number {
  const { base_fee, per_km } = config ?? DEFAULT_COURIER_CONFIG;
  return base_fee + distanceKm * per_km;
}

export interface DeliveryDistanceResult {
  distanceKm: number | null;
  fee: number | null;
  loading: boolean;
  error: string | null;
}

export function useDeliveryDistance(
  storeAddress: string | null | undefined,
  customerAddress: string | null | undefined
): DeliveryDistanceResult {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeCoordRef = useRef<GeoCoord | null>(null);

  useEffect(() => {
    if (!storeAddress || !customerAddress || customerAddress.trim().length < 5) {
      setDistanceKm(null);
      setFee(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!storeCoordRef.current) {
          const coord = await geocodeAddress(storeAddress);
          if (!coord) throw new Error("Endereço da loja não encontrado");
          storeCoordRef.current = coord;
        }
        const customerCoord = await geocodeAddress(customerAddress);
        if (!customerCoord) throw new Error("Endereço do cliente não encontrado");
        const km = await getRouteDistanceKm(storeCoordRef.current, customerCoord);
        if (km === null) throw new Error("Rota não encontrada");
        if (!cancelled) {
          setDistanceKm(km);
          setFee(calculateCourierFee(km));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao calcular distância");
          setDistanceKm(null);
          setFee(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [storeAddress, customerAddress]);

  return { distanceKm, fee, loading, error };
}
