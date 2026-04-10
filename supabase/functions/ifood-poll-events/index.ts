import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get all connected orgs
    const { data: creds, error: credsErr } = await supabase
      .from("ifood_credentials")
      .select("*")
      .eq("status", "connected")
      .not("access_token", "is", null);

    if (credsErr) throw credsErr;
    if (!creds || creds.length === 0) {
      return new Response(JSON.stringify({ message: "No connected orgs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const cred of creds) {
      // Check if token expired, refresh if needed
      let accessToken = cred.access_token;
      if (cred.token_expires_at && new Date(cred.token_expires_at) < new Date()) {
        const refreshRes = await refreshToken(supabase, cred);
        if (!refreshRes) {
          results.push({ org: cred.organization_id, error: "token_refresh_failed" });
          continue;
        }
        accessToken = refreshRes;
      }

      // Poll events
      const eventsRes = await fetch(`${IFOOD_API}/events/v1.0/events:polling`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!eventsRes.ok) {
        results.push({ org: cred.organization_id, error: `poll_failed_${eventsRes.status}` });
        continue;
      }

      const events = await eventsRes.json();
      if (!Array.isArray(events) || events.length === 0) {
        results.push({ org: cred.organization_id, events: 0 });
        continue;
      }

      // Process each event
      const ackIds: string[] = [];
      for (const event of events) {
        if (event.code === "PLC" || event.code === "CFM") {
          // New order placed or confirmed
          await processNewOrder(supabase, cred, accessToken, event);
        }
        if (event.id) ackIds.push(event.id);
      }

      // Acknowledge events
      if (ackIds.length > 0) {
        await fetch(`${IFOOD_API}/events/v1.0/events/acknowledgment`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ackIds.map((id) => ({ id }))),
        });
      }

      results.push({ org: cred.organization_id, events: events.length, acked: ackIds.length });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Poll error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshToken(supabase: any, cred: any): Promise<string | null> {
  try {
    const clientId = Deno.env.get("IFOOD_CLIENT_ID");
    const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
    if (!clientId || !clientSecret) return null;

    const tokenRes = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: cred.refresh_token,
      }),
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();

    await supabase
      .from("ifood_credentials")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || cred.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq("id", cred.id);

    return tokenData.access_token;
  } catch {
    return null;
  }
}

async function processNewOrder(supabase: any, cred: any, token: string, event: any) {
  try {
    const orderId = event.orderId || event.metadata?.orderId;
    if (!orderId) return;

    // Fetch full order details
    const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!orderRes.ok) return;
    const ifoodOrder = await orderRes.json();

    // Build notes
    const customerName = ifoodOrder.customer?.name || "Cliente iFood";
    const customerPhone = ifoodOrder.customer?.phone?.number || "";
    const address = ifoodOrder.delivery?.deliveryAddress
      ? `${ifoodOrder.delivery.deliveryAddress.streetName}, ${ifoodOrder.delivery.deliveryAddress.streetNumber} - ${ifoodOrder.delivery.deliveryAddress.neighborhood}`
      : "";

    const notes = [
      `[iFood] Pedido #${ifoodOrder.displayId || orderId}`,
      customerName,
      customerPhone ? `Tel: ${customerPhone}` : "",
      address ? `Endereço: ${address}` : "",
      ifoodOrder.extraInfo || "",
    ]
      .filter(Boolean)
      .join("\n");

    // Create order in our system
    const { data: newOrder, error: orderErr } = await supabase
      .from("orders")
      .insert({
        organization_id: cred.organization_id,
        table_number: 0,
        status: "pending",
        notes,
        payment_method: ifoodOrder.payments?.methods?.[0]?.method || "ifood",
      })
      .select("id")
      .single();

    if (orderErr || !newOrder) return;

    // Create order items
    const items = (ifoodOrder.items || []).map((item: any) => ({
      order_id: newOrder.id,
      name: item.name || "Item iFood",
      price: (item.totalPrice || item.price || 0) / 100,
      quantity: item.quantity || 1,
      customer_name: customerName,
    }));

    if (items.length > 0) {
      await supabase.from("order_items").insert(items);
    }

    // Confirm order on iFood
    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // Create delivery record if applicable
    if (address && ifoodOrder.orderType === "DELIVERY") {
      await supabase.from("deliveries").insert({
        order_id: newOrder.id,
        organization_id: cred.organization_id,
        customer_address: address,
        fee: (ifoodOrder.delivery?.deliveryFee || 0) / 100,
        status: "pendente",
      });
    }
  } catch (err) {
    console.error("Process order error:", err);
  }
}
