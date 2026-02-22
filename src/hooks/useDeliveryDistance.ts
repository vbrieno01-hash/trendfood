import { useState, useEffect, useRef } from "react";

interface GeoCoord { lat: number; lon: number }

export interface CourierConfig {
  base_fee: number;
  per_km: number;
  daily_rate?: number;
}

export const DEFAULT_COURIER_CONFIG: CourierConfig = { base_fee: 3.0, per_km: 2.5, daily_rate: 0 };

async function tryGeocode(query: string): Promise<GeoCoord | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function tryGeocodeWithRetry(query: string): Promise<GeoCoord | null> {
  try {
    const result = await tryGeocode(query);
    if (result) return result;
  } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 1500));
  return tryGeocode(query);
}

async function geocode(query: string): Promise<GeoCoord | null> {
  const result = await tryGeocodeWithRetry(query);
  if (result) return result;
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocodeWithRetry(`${query}, Brasil`);
  }
  return null;
}

async function getRouteDistanceKm(from: GeoCoord, to: GeoCoord): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) return data.routes[0].distance / 1000;
  } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 1500));
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error("Rota não encontrada");
  return data.routes[0].distance / 1000;
}

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
          const coord = await geocode(storeAddress);
          if (!coord) throw new Error("Endereço da loja não encontrado");
          storeCoordRef.current = coord;
        }
        const customerCoord = await geocode(customerAddress);
        if (!customerCoord) throw new Error("Endereço do cliente não encontrado");
        const km = await getRouteDistanceKm(storeCoordRef.current, customerCoord);
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
