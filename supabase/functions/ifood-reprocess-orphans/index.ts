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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { organization_id, order_ids } = await req.json();
    if (!organization_id || !Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "organization_id e order_ids[] obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: org } = await service
      .from("organizations").select("user_id").eq("id", organization_id).single();
    if (!org || org.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { data: cred } = await service
      .from("ifood_credentials").select("*").eq("organization_id", organization_id).single();
    if (!cred?.access_token) {
      return new Response(JSON.stringify({ error: "iFood não conectado" }), { status: 400, headers: corsHeaders });
    }

    const results: any[] = [];
    for (const orderId of order_ids) {
      try {
        const { data: existing } = await service.from("orders").select("id")
          .eq("organization_id", organization_id)
          .eq("gateway_payment_id", `ifood:${orderId}`).maybeSingle();
        if (existing) { results.push({ orderId, status: "already_exists", internal_id: existing.id }); continue; }

        const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${cred.access_token}` },
        });
        if (!orderRes.ok) {
          results.push({ orderId, status: "fetch_failed", code: orderRes.status });
          continue;
        }
        const ifoodOrder = await orderRes.json();
        const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";

        const { data: newOrder, error: orderErr } = await service.from("orders").insert({
          organization_id,
          table_number: 0,
          status: "pending",
          notes: buildOrderNotes(ifoodOrder),
          payment_method: ifoodOrder.payments?.methods?.[0]?.method || "ifood",
          gateway_payment_id: `ifood:${orderId}`,
          ifood_synced_externally: true,
        }).select("id").single();
        if (orderErr || !newOrder) {
          results.push({ orderId, status: "insert_failed", error: orderErr?.message });
          continue;
        }
        const items = (ifoodOrder.items || []).map((item: any) => ({
          order_id: newOrder.id,
          name: buildItemName(item),
          price: Number(item.totalPrice ?? item.unitPrice ?? 0),
          quantity: item.quantity || 1,
        }));
        if (items.length > 0) await service.from("order_items").insert(items);

        if (!isPickup && ifoodOrder.delivery?.deliveryAddress) {
          const da = ifoodOrder.delivery.deliveryAddress;
          const addr = da.formattedAddress
            || [da.streetName, da.streetNumber, da.neighborhood, da.city].filter(Boolean).join(", ");
          await service.from("deliveries").insert({
            order_id: newOrder.id,
            organization_id,
            customer_address: addr || "iFood delivery",
            fee: Number(ifoodOrder.total?.deliveryFee ?? ifoodOrder.delivery?.deliveryFee ?? 0),
            status: "pendente",
          });
        }

        // Confirma no iFood
        try {
          await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
            method: "POST",
            headers: { Authorization: `Bearer ${cred.access_token}` },
          });
        } catch (_) { /* ignore */ }

        results.push({ orderId, status: "created", internal_id: newOrder.id });
      } catch (e: any) {
        results.push({ orderId, status: "error", error: e?.message });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    return new Response(JSON.stringify({ success: true, created, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ifood-reprocess-orphans] error:", err);
    return new Response(JSON.stringify({ error: "Internal", details: String(err?.message || err) }), { status: 500, headers: corsHeaders });
  }
});