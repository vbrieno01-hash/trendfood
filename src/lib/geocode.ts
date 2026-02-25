/**
 * Shared geocoding utilities with resilient address cleaning for Brazilian addresses.
 * Nominatim fails when addresses start with CEP or contain duplicated tokens like "Casa, Casa".
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
    // Remove CEP patterns
    .replace(/\d{5}-?\d{3},?\s*/g, "")
    // Remove standalone house numbers (", 123," or ", 45,")
    .replace(/,\s*\d{1,5}\s*,/g, ",")
    // Collapse duplicate tokens like "Casa, Casa"
    .replace(/\b(\w+),\s*\1\b/gi, "$1")
    // Clean up extra commas and spaces
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

/**
 * Generate fallback address variants for geocoding, from most specific to least.
 */
export function buildAddressVariants(addr: string): string[] {
  const cleaned = cleanAddressForGeocode(addr);
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const variants: string[] = [cleaned];

  // Remove "Brasil" from end for part counting
  const withoutBrasil = parts.filter((p) => p.toLowerCase() !== "brasil");

  // Fallback: last 4 parts (typically "Bairro, Cidade, Estado, Brasil")
  if (withoutBrasil.length > 3) {
    variants.push(withoutBrasil.slice(-3).join(", ") + ", Brasil");
  }

  // Fallback: last 2 parts (typically "Cidade, Estado, Brasil")
  if (withoutBrasil.length > 2) {
    variants.push(withoutBrasil.slice(-2).join(", ") + ", Brasil");
  }

  return variants;
}

async function tryGeocodeSingle(query: string): Promise<GeoCoord | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

/**
 * Geocode an address with resilient fallback variants.
 * Tries the cleaned full address first, then progressively simpler variants.
 */
export async function geocodeAddress(rawAddress: string): Promise<GeoCoord | null> {
  const variants = buildAddressVariants(rawAddress);

  for (const variant of variants) {
    try {
      const result = await tryGeocodeSingle(variant);
      if (result) return result;
    } catch (e) {
      console.warn(`[geocode] Failed for variant "${variant}":`, e);
    }
    // Small delay between attempts to respect Nominatim rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.error(`[geocode] All variants failed for address: "${rawAddress}"`);
  return null;
}

/**
 * Get route distance in km between two coordinates using OSRM.
 */
export async function getRouteDistanceKm(from: GeoCoord, to: GeoCoord): Promise<number | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.length > 0) return data.routes[0].distance / 1000;
  } catch (e) {
    console.warn("[getRouteDistanceKm] First attempt failed:", e);
  }
  // Retry once
  await new Promise((r) => setTimeout(r, 1500));
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.length > 0) return data.routes[0].distance / 1000;
  } catch (e) {
    console.error("[getRouteDistanceKm] Retry failed:", e);
  }
  return null;
}
