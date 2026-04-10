import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[ifood-webhook] Received event:", JSON.stringify(body).slice(0, 500));

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // iFood sends an array of events
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const { code, orderId, merchantId } = event;

      if (!merchantId) {
        console.warn("[ifood-webhook] Event without merchantId, skipping");
        continue;
      }

      // Find org by merchant_id
      const { data: creds } = await serviceClient
        .from("ifood_credentials")
        .select("organization_id, access_token")
        .eq("merchant_id", merchantId)
        .single();

      if (!creds) {
        console.warn("[ifood-webhook] No org found for merchantId:", merchantId);
        continue;
      }

      // Handle different event types
      switch (code) {
        case "PLC": // Placed - new order
          await handleNewOrder(serviceClient, creds, event);
          break;
        case "CFM": // Confirmed
          console.log("[ifood-webhook] Order confirmed:", orderId);
          break;
        case "CAN": // Cancelled
          await handleCancellation(serviceClient, creds.organization_id, orderId);
          break;
        default:
          console.log("[ifood-webhook] Unhandled event code:", code, "for order:", orderId);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 202,
    });
  } catch (err) {
    console.error("[ifood-webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleNewOrder(
  supabase: ReturnType<typeof createClient>,
  creds: { organization_id: string; access_token: string | null },
  event: any
) {
  const { orderId } = event;

  if (!creds.access_token) {
    console.error("[ifood-webhook] No access token for org:", creds.organization_id);
    return;
  }

  // Fetch full order details from iFood API
  const orderRes = await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${creds.access_token}` },
  });

  if (!orderRes.ok) {
    console.error("[ifood-webhook] Failed to fetch order details:", await orderRes.text());
    return;
  }

  const ifoodOrder = await orderRes.json();

  // Create order in our system
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      organization_id: creds.organization_id,
      table_number: 0, // delivery orders use table 0
      status: "pending",
      payment_method: ifoodOrder.payments?.methods?.[0]?.method ?? "ifood",
      notes: `[iFood #${ifoodOrder.displayId}] ${ifoodOrder.customer?.name ?? ""} — ${ifoodOrder.delivery?.deliveryAddress?.formattedAddress ?? "Retirada"}`,
      gateway_payment_id: `ifood:${orderId}`,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[ifood-webhook] Failed to create order:", orderError);
    return;
  }

  // Create order items
  const items = (ifoodOrder.items ?? []).map((item: any) => ({
    order_id: order.id,
    name: `🛵 ${item.name}`,
    price: (item.totalPrice ?? item.unitPrice ?? 0),
    quantity: item.quantity ?? 1,
    menu_item_id: null,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) {
      console.error("[ifood-webhook] Failed to create order items:", itemsError);
    }
  }

  // Create delivery record if applicable
  if (ifoodOrder.delivery?.deliveryAddress) {
    await supabase.from("deliveries").insert({
      order_id: order.id,
      organization_id: creds.organization_id,
      customer_address: ifoodOrder.delivery.deliveryAddress.formattedAddress ?? "iFood delivery",
      status: "pendente",
      fee: ifoodOrder.delivery?.deliveryFee ?? 0,
    });
  }

  // Confirm order on iFood
  try {
    await fetch(`https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    console.log("[ifood-webhook] Order confirmed on iFood:", orderId);
  } catch (err) {
    console.error("[ifood-webhook] Failed to confirm on iFood:", err);
  }

  console.log("[ifood-webhook] Order created successfully:", order.id, "from iFood:", orderId);
}

async function handleCancellation(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  ifoodOrderId: string
) {
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`)
    .single();

  if (order) {
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);
    console.log("[ifood-webhook] Order cancelled:", order.id);
  }
}
