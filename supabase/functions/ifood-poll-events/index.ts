import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

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

  const pay = io.payments?.methods?.[0] || {};
  const method = pay.method || pay.type || "iFood";
  const prepaid = io.payments?.prepaid === true || pay.prepaid === true;
  parts.push(`PGTO:${prepaid ? "Pago no iFood" : method}`);
  const changeFor = pay.cash?.changeFor;
  if (changeFor && Number(changeFor) > 0) parts.push(`TROCO:${fmtMoney(changeFor)}`);

  const benefits = io.benefits || [];
  if (Array.isArray(benefits) && benefits.length) {
    const labels = benefits.map((b: any) => {
      const name = b.target || b.targetId || b.sponsorshipValues?.[0]?.name || "Voucher";
      const value = b.value ?? b.sponsorshipValues?.[0]?.value ?? 0;
      return `${name} -${fmtMoney(value)}`;
    });
    parts.push(`CUPOM:${labels.join("; ")}`);
  }

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

async function logEvent(supabase: any, orgId: string | null, event: any, source: string, internalOrderId?: string | null) {
  try {
    await supabase.from("ifood_event_log").insert({
      organization_id: orgId,
      ifood_event_id: event.id ?? null,
      ifood_order_id: event.orderId ?? null,
      ifood_display_id: event.displayId ?? null,
      code: event.code ?? "UNKNOWN",
      payload: event,
      internal_order_id: internalOrderId ?? null,
      source,
    });
    if (orgId) {
      await supabase.from("ifood_credentials")
        .update({ last_event_at: new Date().toISOString() })
        .eq("organization_id", orgId);
    }
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
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

    const results: any[] = [];

    for (const cred of creds) {
      let accessToken = cred.access_token;
      if (cred.token_expires_at && new Date(cred.token_expires_at) < new Date()) {
        const refreshed = await refreshToken(supabase, cred);
        if (!refreshed) {
          results.push({ org: cred.organization_id, error: "token_refresh_failed" });
          continue;
        }
        accessToken = refreshed;
      }

      const eventsRes = await fetch(`${IFOOD_API}/events/v1.0/events:polling`, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });

      await supabase.from("ifood_credentials")
        .update({ last_polled_at: new Date().toISOString() })
        .eq("id", cred.id);

      if (!eventsRes.ok) {
        results.push({ org: cred.organization_id, error: `poll_failed_${eventsRes.status}` });
        continue;
      }

      const events = await eventsRes.json();
      if (!Array.isArray(events) || events.length === 0) {
        results.push({ org: cred.organization_id, events: 0 });
        continue;
      }

      const ackIds: string[] = [];
      for (const event of events) {
        await logEvent(supabase, cred.organization_id, event, "polling");

        if (event.code === "PLC" || event.code === "CFM") {
          await processNewOrder(supabase, cred, accessToken, event);
        } else if (event.code === "CAN") {
          await processCancellation(supabase, cred.organization_id, event.orderId);
        }
        if (event.id) ackIds.push(event.id);
      }

      if (ackIds.length > 0) {
        await fetch(`${IFOOD_API}/events/v1.0/events/acknowledgment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(ackIds.map((id) => ({ id }))),
        });
      }

      results.push({ org: cred.organization_id, events: events.length, acked: ackIds.length });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
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

    const params = new URLSearchParams();
    if (cred.refresh_token) {
      params.set("grantType", "refresh_token");
      params.set("clientId", clientId);
      params.set("clientSecret", clientSecret);
      params.set("refreshToken", cred.refresh_token);
    } else {
      params.set("grantType", "client_credentials");
      params.set("clientId", clientId);
      params.set("clientSecret", clientSecret);
    }

    const tokenRes = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();

    await supabase.from("ifood_credentials").update({
      access_token: tokenData.accessToken ?? tokenData.access_token,
      refresh_token: tokenData.refreshToken ?? tokenData.refresh_token ?? cred.refresh_token,
      token_expires_at: new Date(Date.now() + (tokenData.expiresIn ?? tokenData.expires_in ?? 3600) * 1000).toISOString(),
    }).eq("id", cred.id);

    return tokenData.accessToken ?? tokenData.access_token;
  } catch { return null; }
}

async function processNewOrder(supabase: any, cred: any, token: string, event: any) {
  try {
    const orderId = event.orderId || event.metadata?.orderId;
    if (!orderId) return;

    const { data: existing } = await supabase
      .from("orders").select("id")
      .eq("organization_id", cred.organization_id)
      .eq("gateway_payment_id", `ifood:${orderId}`)
      .maybeSingle();
    if (existing) return;

    const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!orderRes.ok) return;
    const ifoodOrder = await orderRes.json();
    const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";

    const { data: newOrder, error: orderErr } = await supabase.from("orders").insert({
      organization_id: cred.organization_id,
      table_number: 0,
      status: "pending",
      notes: buildOrderNotes(ifoodOrder),
      payment_method: ifoodOrder.payments?.methods?.[0]?.method || "ifood",
      gateway_payment_id: `ifood:${orderId}`,
    }).select("id").single();
    if (orderErr || !newOrder) return;

    const items = (ifoodOrder.items || []).map((item: any) => ({
      order_id: newOrder.id,
      name: buildItemName(item),
      price: Number(item.totalPrice ?? item.unitPrice ?? 0),
      quantity: item.quantity || 1,
    }));
    if (items.length > 0) await supabase.from("order_items").insert(items);

    if (!isPickup && ifoodOrder.delivery?.deliveryAddress) {
      const da = ifoodOrder.delivery.deliveryAddress;
      const addr = da.formattedAddress
        || [da.streetName, da.streetNumber, da.neighborhood, da.city].filter(Boolean).join(", ");
      await supabase.from("deliveries").insert({
        order_id: newOrder.id,
        organization_id: cred.organization_id,
        customer_address: addr || "iFood delivery",
        fee: Number(ifoodOrder.total?.deliveryFee ?? ifoodOrder.delivery?.deliveryFee ?? 0),
        status: "pendente",
      });
    }

    await logEvent(supabase, cred.organization_id, { ...event, displayId: ifoodOrder.displayId }, "polling", newOrder.id);

    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("Process order error:", err);
  }
}

async function processCancellation(supabase: any, orgId: string, ifoodOrderId: string) {
  if (!ifoodOrderId) return;
  const { data: order } = await supabase.from("orders")
    .select("id")
    .eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`)
    .maybeSingle();
  if (order) {
    await supabase.from("orders").update({
      status: "cancelled",
      cancellation_reason: "Cancelado pelo iFood",
    }).eq("id", order.id);
  }
}
