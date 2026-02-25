import { useState, useEffect } from "react";
import { calculateDistanceViaEdge, type GeoCoord } from "@/lib/geocode";

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
        const result = await calculateDistanceViaEdge(storeAddress, customerAddress);
        if (!cancelled) {
          if (result.distance_km !== null && result.fee !== null) {
            setDistanceKm(result.distance_km);
            setFee(result.fee);
          } else {
            setError(result.error === "identical_coordinates"
              ? "Endereços resolveram para o mesmo ponto"
              : result.error ?? "Erro ao calcular distância");
            setDistanceKm(null);
            setFee(null);
          }
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
