import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GeoCoord {
  lat: number;
  lon: number;
}

function cleanAddressForGeocode(addr: string): string {
  return addr
    .replace(/\d{5}-?\d{3},?\s*/g, "")
    .replace(/,\s*\d{1,5}\s*,/g, ",")
    .replace(/\b(\w+),\s*\1\b/gi, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*$/, "")
    .trim();
}

function extractCep(addr: string): string | null {
  const match = addr.match(/(\d{5})-?(\d{3})/);
  return match ? match[1] + match[2] : null;
}

function extractAddressFields(cleaned: string): { street?: string; city?: string; state?: string } {
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  const withoutBrasil = parts.filter((p) => p.toLowerCase() !== "brasil");
  if (withoutBrasil.length < 2) return {};
  const lastPart = withoutBrasil[withoutBrasil.length - 1];
  const isState = /^[A-Z]{2}$/.test(lastPart);
  const state = isState ? lastPart : undefined;
  const cityIdx = isState ? withoutBrasil.length - 2 : withoutBrasil.length - 1;
  const city = withoutBrasil[cityIdx];
  const street = withoutBrasil.length > (isState ? 2 : 1) ? withoutBrasil[0] : undefined;
  return { street, city, state };
}

function buildAddressVariants(addr: string): string[] {
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryGeocodeSingle(query: string): Promise<GeoCoord | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0 (delivery-geocoding)" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function tryGeocodeStructured(street: string, city: string, state?: string): Promise<GeoCoord | null> {
  const params = new URLSearchParams({ street, city, country: "Brazil", format: "json", limit: "1" });
  if (state) params.set("state", state);
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0 (delivery-geocoding)" },
  });
  const data = await res.json();
  if (!data || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function geocodeAddress(rawAddress: string): Promise<GeoCoord | null> {
  const cleaned = cleanAddressForGeocode(rawAddress);
  const fields = extractAddressFields(cleaned);

  // 1. Try CEP via ViaCEP for more precise city-level coords
  const cep = extractCep(rawAddress);
  if (cep) {
    try {
      const viaRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const viaData = await viaRes.json();
      if (!viaData.erro && viaData.localidade) {
        // Use city + state from ViaCEP for more precise geocoding
        const query = `${viaData.logradouro ? viaData.logradouro + ", " : ""}${viaData.localidade}, ${viaData.uf}, Brasil`;
        const result = await tryGeocodeSingle(query);
        if (result) return result;
      }
    } catch (e) {
      console.warn(`[geocode] ViaCEP failed for ${cep}:`, e);
    }
  }

  // 2. Full cleaned text
  try {
    const result = await tryGeocodeSingle(cleaned);
    if (result) return result;
  } catch (e) {
    console.warn(`[geocode] Full text failed for "${cleaned}":`, e);
  }

  // 3. Structured search
  if (fields.street && fields.city) {
    await delay(200);
    try {
      const result = await tryGeocodeStructured(fields.street, fields.city, fields.state);
      if (result) return result;
    } catch (e) {
      console.warn(`[geocode] Structured search failed:`, e);
    }
  }

  // 4. Simpler fallback variants
  const variants = buildAddressVariants(rawAddress);
  for (let i = 1; i < variants.length; i++) {
    await delay(200);
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

function areCoordsIdentical(a: GeoCoord, b: GeoCoord): boolean {
  return Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lon - b.lon) < 0.0001;
}

async function getRouteDistanceKm(from: GeoCoord, to: GeoCoord): Promise<number | null> {
  if (areCoordsIdentical(from, to)) {
    console.warn("[route] Identical coordinates — geocoding fell back to same centroid");
    return null;
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await delay(500);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length > 0) return data.routes[0].distance / 1000;
    } catch (e) {
      console.warn(`[route] Attempt ${attempt + 1} failed:`, e);
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_address, customer_address, courier_config } = await req.json();

    if (!store_address || !customer_address) {
      return new Response(
        JSON.stringify({ error: "store_address and customer_address are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[geocode-distance] store="${store_address}" customer="${customer_address}"`);

    // Geocode both addresses in PARALLEL
    const [storeCoord, customerCoord] = await Promise.all([
      geocodeAddress(store_address),
      geocodeAddress(customer_address),
    ]);

    if (!storeCoord) {
      return new Response(
        JSON.stringify({ distance_km: null, fee: null, error: "store_address_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!customerCoord) {
      return new Response(
        JSON.stringify({ distance_km: null, fee: null, error: "customer_address_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const km = await getRouteDistanceKm(storeCoord, customerCoord);

    if (km === null) {
      return new Response(
        JSON.stringify({ distance_km: null, fee: null, error: "identical_coordinates" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseFee = courier_config?.base_fee ?? 3.0;
    const perKm = courier_config?.per_km ?? 2.5;
    const fee = baseFee + km * perKm;

    console.log(`[geocode-distance] Result: ${km.toFixed(2)} km, fee: R$ ${fee.toFixed(2)}`);

    return new Response(
      JSON.stringify({ distance_km: km, fee, store_coord: storeCoord, customer_coord: customerCoord }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[geocode-distance] Error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
