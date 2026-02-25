import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/hooks/useOrders";
import { calculateCourierFee, CourierConfig } from "@/hooks/useDeliveryDistance";
import { geocodeAddress, getRouteDistanceKm } from "@/lib/geocode";

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
    const storeCoord = await geocodeAddress(storeAddress);
    if (!storeCoord) {
      console.error(`[delivery ${deliveryId}] Failed to geocode store address: "${storeAddress}"`);
      return;
    }

    const customerCoord = await geocodeAddress(customerAddress);
    if (!customerCoord) {
      console.error(`[delivery ${deliveryId}] Failed to geocode customer address: "${customerAddress}"`);
      return;
    }

    const km = await getRouteDistanceKm(storeCoord, customerCoord);
    if (km === null) {
      // null means identical coords or route failure — do NOT update, leave as null
      console.warn(`[delivery ${deliveryId}] Could not determine reliable distance (coords may be identical)`);
      return;
    }

    const fee = calculateCourierFee(km, courierConfig);

    await supabase
      .from("deliveries")
      .update({ distance_km: km, fee })
      .eq("id", deliveryId);

    console.log(`[delivery ${deliveryId}] Distance calculated: ${km.toFixed(2)} km, fee: R$ ${fee.toFixed(2)}`);
  } catch (e) {
    console.error(`[delivery ${deliveryId}] Error calculating distance:`, e);
  }
}

/**
 * Recalculate distance for deliveries that have null distance_km.
 * Called from the courier dashboard to fix historical deliveries.
 */
export async function recalculateNullDistances(
  orgId: string,
  storeAddress: string | null | undefined,
  courierConfig?: CourierConfig | null
): Promise<number> {
  if (!storeAddress) return 0;

  const { data: nullDeliveries } = await supabase
    .from("deliveries")
    .select("id, customer_address")
    .eq("organization_id", orgId)
    .eq("status", "entregue")
    .is("distance_km", null)
    .limit(10);

  if (!nullDeliveries || nullDeliveries.length === 0) return 0;

  let fixed = 0;
  for (const d of nullDeliveries) {
    if (d.customer_address === "Endereço não informado") continue;
    try {
      await calculateAndUpdateDelivery(d.id, storeAddress, d.customer_address, courierConfig ?? undefined);
      fixed++;
    } catch (e) {
      console.error(`[recalc ${d.id}] Error:`, e);
    }
    // Respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return fixed;
}
