/**
 * Geocoding utilities — now proxied through edge function to avoid CORS/rate-limit issues.
 * Direct Nominatim calls are kept as fallback reference but the primary path uses the edge function.
 */

export interface GeoCoord {
  lat: number;
  lon: number;
}

/**
 * Clean a Brazilian address for geocoding:
 * - Remove CEP (XXXXX-XXX or XXXXXXXX) from anywhere
 * - Remove duplicate tokens like "Casa, Casa"
 * - Remove house numbers (just digits) that confuse Nominatim
 */
export function cleanAddressForGeocode(addr: string): string {
  return addr
    .replace(/\d{5}-?\d{3},?\s*/g, "")
    .replace(/,\s*\d{1,5}\s*,/g, ",")
    .replace(/\b(\w+),\s*\1\b/gi, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

export function buildAddressVariants(addr: string): string[] {
  const cleaned = cleanAddressForGeocode(addr);
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const variants: string[] = [cleaned];
  const withoutBrasil = parts.filter((p) => p.toLowerCase() !== "brasil");
  if (withoutBrasil.length > 3) {
    variants.push(withoutBrasil.slice(-3).join(", ") + ", Brasil");
  }
  if (withoutBrasil.length > 2) {
    variants.push(withoutBrasil.slice(-2).join(", ") + ", Brasil");
  }
  return variants;
}

export function areCoordsIdentical(a: GeoCoord, b: GeoCoord): boolean {
  return Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lon - b.lon) < 0.0001;
}

export interface GeocodeDistanceResult {
  distance_km: number | null;
  fee: number | null;
  error?: string;
  store_coord?: GeoCoord;
  customer_coord?: GeoCoord;
}

/**
 * Call the geocode-distance edge function to calculate distance server-side.
 * This avoids CORS issues with Nominatim and respects rate limits.
 */
export async function calculateDistanceViaEdge(
  storeAddress: string,
  customerAddress: string,
  courierConfig?: { base_fee?: number; per_km?: number }
): Promise<GeocodeDistanceResult> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const url = `https://${projectId}.supabase.co/functions/v1/geocode-distance`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
    },
    body: JSON.stringify({
      store_address: storeAddress,
      customer_address: customerAddress,
      courier_config: courierConfig,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge function error: ${res.status} ${text}`);
  }

  return await res.json();
}

// Legacy exports kept for compatibility but no longer used directly from browser
export async function geocodeAddress(_rawAddress: string): Promise<GeoCoord | null> {
  console.warn("[geocode] Direct browser geocoding is deprecated. Use calculateDistanceViaEdge instead.");
  return null;
}

export async function getRouteDistanceKm(_from: GeoCoord, _to: GeoCoord): Promise<number | null> {
  console.warn("[geocode] Direct browser routing is deprecated. Use calculateDistanceViaEdge instead.");
  return null;
}
