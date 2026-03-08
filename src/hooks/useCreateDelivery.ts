import { supabase } from "@/integrations/supabase/client";
import { Order } from "@/hooks/useOrders";
import { calculateCourierFee, CourierConfig } from "@/hooks/useDeliveryDistance";
import { calculateDistanceViaEdge } from "@/lib/geocode";

/**
 * Extract customer address from the pipe-separated notes field.
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
 * Extract the delivery fee from notes (set by store owner via neighborhood pricing).
 * Formats: "FRETE:R$ 6,00" → 6.00 | "FRETE:Grátis" → 0 | not found → null
 */
export function parseFreteFromNotes(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const match = notes.match(/FRETE:([^|]+)/);
  if (!match) return null;
  const raw = match[1].trim();
  if (/gr[aá]tis/i.test(raw)) return 0;
  const numeric = raw.replace(/[^\d,\.]/g, "").replace(",", ".");
  const val = parseFloat(numeric);
  return isNaN(val) ? null : val;
}

/**
 * Create a delivery record for a delivery order marked as ready.
 * Distance/fee calculation runs in background via edge function.
 */
export async function createDeliveryForOrder(
  order: Order,
  organizationId: string,
  storeAddress: string | null | undefined,
  courierConfig?: CourierConfig | null
): Promise<void> {
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id")
    .eq("order_id", order.id)
    .limit(1);

  if (existing && existing.length > 0) return;

  const customerAddress = parseAddressFromNotes(order.notes);

  // Use the fee set by the store owner (from neighborhood pricing), fallback to courier base_fee
  const ownerFee = parseFreteFromNotes(order.notes);
  const fee = ownerFee !== null ? ownerFee : (courierConfig?.base_fee ?? 3.0);

  const { data: delivery, error } = await supabase
    .from("deliveries")
    .insert({
      order_id: order.id,
      organization_id: organizationId,
      customer_address: customerAddress,
      status: "pendente",
      fee,
    })
    .select("id")
    .single();

  if (error || !delivery) {
    console.error("Failed to create delivery:", error);
    return;
  }

  // Background: calculate distance via edge function and update
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
    const result = await calculateDistanceViaEdge(storeAddress, customerAddress, courierConfig);

    if (result.error === "identical_coordinates") {
      console.warn(`[delivery ${deliveryId}] Identical coordinates — not updating distance`);
      return;
    }

    if (result.distance_km === null || result.fee === null) {
      console.warn(`[delivery ${deliveryId}] Could not calculate distance: ${result.error}`);
      return;
    }

    // Only update distance_km — fee comes from the store owner's neighborhood pricing
    await supabase
      .from("deliveries")
      .update({ distance_km: result.distance_km })
      .eq("id", deliveryId);

    console.log(`[delivery ${deliveryId}] Distance: ${result.distance_km.toFixed(2)} km`);
  } catch (e) {
    console.error(`[delivery ${deliveryId}] Error calculating distance:`, e);
  }
}

/**
 * Recalculate distance for deliveries that have null distance_km.
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
      const result = await calculateDistanceViaEdge(storeAddress, d.customer_address, courierConfig ?? undefined);

      if (result.distance_km !== null) {
        await supabase
          .from("deliveries")
          .update({ distance_km: result.distance_km })
          .eq("id", d.id);
        fixed++;
      }
    } catch (e) {
      console.error(`[recalc ${d.id}] Error:`, e);
    }
    // Respect rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  return fixed;
}
