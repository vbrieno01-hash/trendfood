import { useState, useEffect, useRef } from "react";
import { Organization } from "@/hooks/useOrganization";

export interface DeliveryConfig {
  fee_tier1: number;
  fee_tier2: number;
  fee_tier3: number;
  tier1_km: number;
  tier2_km: number;
  free_above: number;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  fee_tier1: 5,
  fee_tier2: 8,
  fee_tier3: 12,
  tier1_km: 2,
  tier2_km: 5,
  free_above: 100,
};

interface GeoCoord { lat: number; lon: number }

interface UseDeliveryFeeResult {
  fee: number;
  freeShipping: boolean;
  loading: boolean;
  error: string | null;
  distanceKm: number | null;
  noStoreAddress: boolean;
}

async function tryGeocode(query: string): Promise<GeoCoord | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// Remove the complement field from store addresses before geocoding.
// New format (with CEP): CEP, street, number, [complement], neighborhood, city, state, Brasil → 8 parts
// Old format (no CEP):   street, number, [complement], neighborhood, city, state, Brasil    → 7 parts
// Complement is always at index 3 (new) or index 2 (old).
function stripComplementForGeo(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // New format starts with a CEP pattern (digits + optional hyphen)
  const startsWithCep = /^\d{5}-?\d{3}$/.test(parts[0] ?? "");
  if (startsWithCep && parts.length >= 8) {
    // CEP, street, number, [complement], neighborhood, city, state, Brasil → remove index 3
    parts.splice(3, 1);
  } else if (!startsWithCep && parts.length >= 7) {
    // street, number, [complement], neighborhood, city, state, Brasil → remove index 2
    parts.splice(2, 1);
  }
  return parts.join(", ");
}

async function geocode(query: string): Promise<GeoCoord | null> {
  const parts = query.split(",").map((p) => p.trim());
  // Se começa com CEP, tenta só o CEP primeiro (muito mais preciso no Nominatim)
  if (/^\d{5}-?\d{3}$/.test(parts[0] ?? "")) {
    const r = await tryGeocode(`${parts[0]}, Brasil`);
    if (r) return r;
  }
  // Query completa
  const result = await tryGeocode(query);
  if (result) return result;
  // Fallback com Brasil
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocode(`${query}, Brasil`);
  }
  return null;
}

// Geocodifica o endereço da loja de forma otimizada:
// Prioriza CEP + Cidade + Estado para evitar que CEPs mapeados erroneamente no Nominatim
// retornem coordenadas de outro estado. Fallback: só Cidade + Estado, depois texto completo.
async function geocodeStoreAddress(address: string): Promise<GeoCoord | null> {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const cepPattern = /^\d{5}-?\d{3}$/;

  if (cepPattern.test(parts[0] ?? "")) {
    const cep = parts[0];
    // city = antepenúltimo (antes de estado e "Brasil")
    const city = parts[parts.length - 3] ?? "";
    const state = parts[parts.length - 2] ?? "";

    // Tentativa 1: CEP + cidade + estado (força resultado na região correta)
    const r1 = await tryGeocode(`${cep}, ${city}, ${state}, Brasil`);
    if (r1) return r1;

    // Tentativa 2: só cidade + estado (ignora CEP problemático)
    const r2 = await tryGeocode(`${city}, ${state}, Brasil`);
    if (r2) return r2;
  }

  // Fallback: endereço textual sem complemento
  return geocode(stripComplementForGeo(address));
}

async function getRouteDistanceKm(from: GeoCoord, to: GeoCoord): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error("Rota não encontrada");
  return data.routes[0].distance / 1000; // meters → km
}

function applyFeeTable(distanceKm: number, subtotal: number, config: DeliveryConfig): { fee: number; freeShipping: boolean } {
  if (subtotal >= config.free_above) return { fee: 0, freeShipping: true };
  if (distanceKm <= config.tier1_km) return { fee: config.fee_tier1, freeShipping: false };
  if (distanceKm <= config.tier2_km) return { fee: config.fee_tier2, freeShipping: false };
  return { fee: config.fee_tier3, freeShipping: false };
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

  // Cache store geocode per session
  const storeCoordRef = useRef<GeoCoord | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storeAddress = (org as { store_address?: string | null })?.store_address;
  const deliveryConfigRaw = (org as { delivery_config?: DeliveryConfig | null })?.delivery_config;
  const config: DeliveryConfig = deliveryConfigRaw
    ? { ...DEFAULT_DELIVERY_CONFIG, ...deliveryConfigRaw }
    : DEFAULT_DELIVERY_CONFIG;

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
        // Geocode store (cached) — usa CEP isolado quando disponível para máxima precisão
          if (!storeCoordRef.current) {
            const coord = await geocodeStoreAddress(storeAddress);
          if (!coord) throw new Error("Endereço da loja não encontrado");
          storeCoordRef.current = coord;
        }

        // customerAddress already arrives without complement and with city/state from UnitPage
        const customerCoord = await geocode(customerAddress);
        if (!customerCoord) throw new Error("Endereço não encontrado");

        const km = await getRouteDistanceKm(storeCoordRef.current, customerCoord);
        const result = applyFeeTable(km, subtotal, config);
        setDistanceKm(km);
        setFee(result.fee);
        setFreeShipping(result.freeShipping);
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
