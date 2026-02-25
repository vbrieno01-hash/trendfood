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
 * Extract structured address fields (street, city, state) from a cleaned Brazilian address.
 */
function extractAddressFields(cleaned: string): { street?: string; city?: string; state?: string } {
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const withoutBrasil = parts.filter((p) => p.toLowerCase() !== "brasil");

  if (withoutBrasil.length < 2) return {};

  // Last part is usually state (2-letter UF)
  const lastPart = withoutBrasil[withoutBrasil.length - 1];
  const isState = /^[A-Z]{2}$/.test(lastPart);

  const state = isState ? lastPart : undefined;
  const cityIdx = isState ? withoutBrasil.length - 2 : withoutBrasil.length - 1;
  const city = withoutBrasil[cityIdx];
  // First part is typically the street
  const street = withoutBrasil.length > (isState ? 2 : 1) ? withoutBrasil[0] : undefined;

  return { street, city, state };
}

/**
 * Try structured Nominatim search with separate street/city/state params.
 * This has better results for Brazilian addresses than free-text search.
 */
async function tryGeocodeStructured(street: string, city: string, state?: string): Promise<GeoCoord | null> {
  const params = new URLSearchParams({
    street,
    city,
    country: "Brazil",
    format: "json",
    limit: "1",
  });
  if (state) params.set("state", state);

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0" },
    });
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {
    console.warn(`[geocode] Structured search failed for "${street}, ${city}":`, e);
    return null;
  }
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
 * Tries: 1) cleaned full text, 2) structured search, 3) progressively simpler variants.
 */
export async function geocodeAddress(rawAddress: string): Promise<GeoCoord | null> {
  const cleaned = cleanAddressForGeocode(rawAddress);
  const fields = extractAddressFields(cleaned);

  // 1. Try full cleaned text
  try {
    const result = await tryGeocodeSingle(cleaned);
    if (result) return result;
  } catch (e) {
    console.warn(`[geocode] Full text failed for "${cleaned}":`, e);
  }

  // 2. Try structured search (street + city + state)
  if (fields.street && fields.city) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const result = await tryGeocodeStructured(fields.street, fields.city, fields.state);
      if (result) return result;
    } catch (e) {
      console.warn(`[geocode] Structured search failed:`, e);
    }
  }

  // 3. Try simpler fallback variants
  const variants = buildAddressVariants(rawAddress);
  // Skip first variant (already tried as full text above)
  for (let i = 1; i < variants.length; i++) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      const result = await tryGeocodeSingle(variants[i]);
      if (result) return result;
    } catch (e) {
      console.warn(`[geocode] Failed for variant "${variants[i]}":`, e);
    }
  }

  console.error(`[geocode] All variants failed for address: "${rawAddress}"`);
  return null;
}

/**
 * Check if two coordinates are effectively identical (same fallback point).
 */
export function areCoordsIdentical(a: GeoCoord, b: GeoCoord): boolean {
  return Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lon - b.lon) < 0.0001;
}

/**
 * Get route distance in km between two coordinates using OSRM.
 * Returns null if coords are identical (indicates geocoding fell back to same point).
 */
export async function getRouteDistanceKm(from: GeoCoord, to: GeoCoord): Promise<number | null> {
  // Detect identical coordinates — both addresses resolved to same fallback
  if (areCoordsIdentical(from, to)) {
    console.warn("[getRouteDistanceKm] Identical coordinates detected — geocoding likely fell back to same area centroid");
    return null;
  }

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
