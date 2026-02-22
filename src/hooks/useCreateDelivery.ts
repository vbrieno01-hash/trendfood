import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/hooks/useOrders";
import { calculateCourierFee, CourierConfig } from "@/hooks/useDeliveryDistance";

/**
 * Extract customer address from the pipe-separated notes field.
 * Format: TIPO:Entrega|CLIENTE:Joao|END.:Rua X, 123, Bairro, Cidade, SP, Brasil|...
 */
export function parseAddressFromNotes(notes: string | null | undefined): string {
  if (!notes) return "Endereço não informado";
  const match = notes.match(/END\.:([^|]+)/);
  return match ? match[1].trim() : "Endereço não informado";
}

export function parsePhoneFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/TEL:([^|]+)/);
  return match ? match[1].trim().replace(/\D/g, "") : null;
}

async function tryGeocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR", "User-Agent": "TrendFood/1.0" },
    });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

async function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  const result = await tryGeocode(query);
  if (result) return result;
  if (!query.toLowerCase().includes("brasil")) {
    return tryGeocode(`${query}, Brasil`);
  }
  return null;
}

async function getRouteDistanceKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.length > 0) return data.routes[0].distance / 1000;
  } catch { /* ignore */ }
  return null;
}

/**
 * Create a delivery record for a delivery order marked as ready.
 * Distance/fee calculation runs in background — delivery is created immediately.
 */
export async function createDeliveryForOrder(
  order: Order,
  organizationId: string,
  storeAddress: string | null | undefined,
  courierConfig?: CourierConfig | null
): Promise<void> {
  // Check for duplicate
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id")
    .eq("order_id", order.id)
    .limit(1);

  if (existing && existing.length > 0) return;

  const customerAddress = parseAddressFromNotes(order.notes);

  // Insert with base fee as fallback (geocoding may fail)
  const baseFee = courierConfig?.base_fee ?? 3.0;
  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({
      order_id: order.id,
      organization_id: organizationId,
      customer_address: customerAddress,
      status: "pendente",
      fee: baseFee,
    })
    .select("id")
    .single();

  if (error || !delivery) {
    console.error("Failed to create delivery:", error);
    return;
  }

  // Background: calculate distance and update
  if (storeAddress && customerAddress !== "Endereço não informado") {
    calculateAndUpdateDelivery(delivery.id, storeAddress, customerAddress, courierConfig ?? undefined);
  }
}

async function calculateAndUpdateDelivery(
  deliveryId: string,
  storeAddress: string,
  customerAddress: string,
  courierConfig?: CourierConfig
): Promise<void> {
  try {
    const storeCoord = await geocode(storeAddress);
    if (!storeCoord) return;

    const customerCoord = await geocode(customerAddress);
    if (!customerCoord) return;

    const km = await getRouteDistanceKm(storeCoord, customerCoord);
    if (km === null) return;

    const fee = calculateCourierFee(km, courierConfig);

    await supabase
      .from("deliveries")
      .update({ distance_km: km, fee })
      .eq("id", deliveryId);
  } catch {
    // Silently fail — delivery already exists for the courier to see
  }
}
