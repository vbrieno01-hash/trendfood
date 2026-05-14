import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

// ----- Helpers de extração de campos -----
function fmtMoney(cents: number | null | undefined): string {
  const n = Number(cents ?? 0);
  if (!isFinite(n)) return "R$ 0,00";
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function buildOrderNotes(io: any): string {
  const parts: string[] = [];
  const orderType = String(io.orderType || "DELIVERY").toUpperCase();
  const isPickup = orderType === "TAKEOUT";
  parts.push(`TIPO:${isPickup ? "Retirada" : "Entrega"}`);

  const cust = io.customer || {};
  if (cust.name) parts.push(`CLIENTE:${cust.name}`);
  const phone = cust.phone?.number || cust.phone || "";
  if (phone) parts.push(`TEL:${phone}`);
  const doc = cust.documentNumber || cust.taxPayerIdentificationNumber;
  if (doc) parts.push(`CPF:${doc}`);

  const da = io.delivery?.deliveryAddress;
  if (!isPickup && da) {
    const addr = da.formattedAddress
      || [da.streetName, da.streetNumber, da.neighborhood, da.city, da.state]
        .filter(Boolean).join(", ");
    if (addr) parts.push(`END.:${addr}`);
    if (da.neighborhood) parts.push(`BAIRRO:${da.neighborhood}`);
    const fee = io.total?.deliveryFee ?? io.delivery?.deliveryFee;
    if (fee != null) parts.push(`FRETE:${fmtMoney(fee)}`);
  }

  // Pagamento
  const pay = io.payments?.methods?.[0] || {};
  const method = pay.method || pay.type || "iFood";
  const prepaid = io.payments?.prepaid === true || pay.prepaid === true;
  parts.push(`PGTO:${prepaid ? "Pago no iFood" : method}`);
  const changeFor = pay.cash?.changeFor;
  if (changeFor && Number(changeFor) > 0) {
    parts.push(`TROCO:${fmtMoney(changeFor)}`);
  }

  // Voucher / benefícios
  const benefits = io.benefits || [];
  if (Array.isArray(benefits) && benefits.length) {
    const labels = benefits.map((b: any) => {
      const name = b.target || b.targetId || b.sponsorshipValues?.[0]?.name || "Voucher";
      const value = b.value ?? b.sponsorshipValues?.[0]?.value ?? 0;
      return `${name} -${fmtMoney(value)}`;
    });
    parts.push(`CUPOM:${labels.join("; ")}`);
  }

  // Agendamento
  if (String(io.orderTiming).toUpperCase() === "SCHEDULED") {
    const sched = io.schedule?.deliveryDateTimeStart
      || io.schedule?.scheduledDateTimeStart
      || io.scheduledDateTime;
    if (sched) parts.push(`AGENDADO:${sched}`);
  }

  if (io.extraInfo) parts.push(`OBS:${String(io.extraInfo).replace(/[|\n\r]+/g, " ").slice(0, 500)}`);

  parts.push(`IFOOD_DISPLAY:${io.displayId || ""}`);
  return parts.filter(Boolean).join("|");
}

function buildItemName(item: any): string {
  const base = item.name || "Item iFood";
  const opts = (item.options || item.subItems || []) as any[];
  const addons = opts.map((o) => {
    const qty = o.quantity || 1;
    const price = (o.totalPrice ?? o.price ?? o.unitPrice ?? 0);
    return `${qty}x ${o.name || "Adicional"} ${fmtMoney(price)}`;
  });
  let name = base;
  if (addons.length) name += ` (+ ${addons.join(", ")})`;
  if (item.observations) name += ` | Obs: ${String(item.observations).slice(0, 200)}`;
  return name;
}

async function logEvent(
  supabase: any,
  organizationId: string | null,
  event: any,
  source: string,
  internalOrderId?: string | null
) {
  try {
    await supabase.from("ifood_event_log").insert({
      organization_id: organizationId,
      ifood_event_id: event.id ?? null,
      ifood_order_id: event.orderId ?? null,
      ifood_display_id: event.displayId ?? null,
      code: event.code ?? event.fullCode ?? "UNKNOWN",
      payload: event,
      internal_order_id: internalOrderId ?? null,
      source,
    });
    if (organizationId) {
      await supabase.from("ifood_credentials")
        .update({ last_event_at: new Date().toISOString() })
        .eq("organization_id", organizationId);
    }
  } catch (_) { /* swallow */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Health-check (GET) usado pelo portal iFood para validar a URL
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      console.log("[ifood-webhook] Empty or invalid body, returning 200");
      return new Response(JSON.stringify({ success: true, message: "No body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    console.log("[ifood-webhook] Received event:", JSON.stringify(body).slice(0, 500));

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      const { code, orderId, merchantId } = event;

      if (!merchantId) {
        console.warn("[ifood-webhook] Event without merchantId, skipping");
        await logEvent(serviceClient, null, event, "webhook");
        continue;
      }

      const { data: creds } = await serviceClient
        .from("ifood_credentials")
        .select("organization_id, access_token")
        .eq("merchant_id", merchantId)
        .single();

      if (!creds) {
        console.warn("[ifood-webhook] No org found for merchantId:", merchantId);
        await logEvent(serviceClient, null, event, "webhook");
        continue;
      }

      await logEvent(serviceClient, creds.organization_id, event, "webhook");

      switch (code) {
        case "PLC":
        case "CFM":
          await handleNewOrder(serviceClient, creds, event);
          break;
        case "CAN":
        case "CANCELLED":
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

  // Idempotência: já criamos esse pedido antes?
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("organization_id", creds.organization_id)
    .eq("gateway_payment_id", `ifood:${orderId}`)
    .maybeSingle();
  if (existing) {
    console.log("[ifood-webhook] Order already exists, skipping:", orderId);
    return;
  }

  const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${creds.access_token}` },
  });

  if (!orderRes.ok) {
    console.error("[ifood-webhook] Failed to fetch order details:", await orderRes.text());
    return;
  }

  const ifoodOrder = await orderRes.json();
  const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";
  const orderTotal = ifoodOrder.total?.orderAmount ?? ifoodOrder.totalPrice ?? null;
  const subtotal = ifoodOrder.total?.subTotal ?? null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      organization_id: creds.organization_id,
      table_number: 0,
      status: "pending",
      payment_method: ifoodOrder.payments?.methods?.[0]?.method ?? "ifood",
      notes: buildOrderNotes(ifoodOrder),
      total: orderTotal,
      subtotal: subtotal,
      gateway_payment_id: `ifood:${orderId}`,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[ifood-webhook] Failed to create order:", orderError);
    return;
  }

  const items = (ifoodOrder.items ?? []).map((item: any) => ({
    order_id: order.id,
    name: buildItemName(item),
    price: Number(item.totalPrice ?? item.unitPrice ?? 0),
    quantity: item.quantity ?? 1,
    menu_item_id: null,
  }));

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(items);
    if (itemsError) {
      console.error("[ifood-webhook] Failed to create order items:", itemsError);
    }
  }

  if (!isPickup && ifoodOrder.delivery?.deliveryAddress) {
    const da = ifoodOrder.delivery.deliveryAddress;
    const addr = da.formattedAddress
      || [da.streetName, da.streetNumber, da.neighborhood, da.city].filter(Boolean).join(", ");
    await supabase.from("deliveries").insert({
      order_id: order.id,
      organization_id: creds.organization_id,
      customer_address: addr || "iFood delivery",
      status: "pendente",
      fee: Number(ifoodOrder.total?.deliveryFee ?? ifoodOrder.delivery?.deliveryFee ?? 0),
    });
  }

  // Loga vínculo do pedido interno
  await logEvent(supabase, creds.organization_id, { ...event, displayId: ifoodOrder.displayId }, "webhook", order.id);

  // Confirma no iFood
  try {
    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    console.log("[ifood-webhook] Order confirmed on iFood:", orderId);
  } catch (err) {
    console.error("[ifood-webhook] Failed to confirm on iFood:", err);
  }
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
      .update({ status: "cancelled", cancellation_source: "ifood" } as any)
      .eq("id", order.id);
    console.log("[ifood-webhook] Order cancelled:", order.id);

    // Notifica lojista via Telegram
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-merchant-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          event_type: "ifood_cancelled",
          ifood_order_id: ifoodOrderId,
        }),
      });
    } catch (_) { /* swallow */ }
  }
}
