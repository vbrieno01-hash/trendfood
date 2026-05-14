import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";
const LOOKBACK_MINUTES = 60;
const BATCH_LIMIT = 50;

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

async function reprocessOrder(service: any, cred: any, orderId: string): Promise<{ status: string; internal_id?: string; error?: string }> {
  const { data: existing } = await service.from("orders").select("id")
    .eq("organization_id", cred.organization_id)
    .eq("gateway_payment_id", `ifood:${orderId}`).maybeSingle();
  if (existing) return { status: "already_exists", internal_id: existing.id };

  const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${cred.access_token}` },
  });
  if (!orderRes.ok) {
    return { status: "fetch_failed", error: `HTTP ${orderRes.status}` };
  }
  const ifoodOrder = await orderRes.json();
  const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";

  const { data: newOrder, error: orderErr } = await service.from("orders").insert({
    organization_id: cred.organization_id,
    table_number: 0,
    status: "pending",
    notes: buildOrderNotes(ifoodOrder),
    payment_method: ifoodOrder.payments?.methods?.[0]?.method || "ifood",
    gateway_payment_id: `ifood:${orderId}`,
    ifood_synced_externally: true,
  }).select("id").single();
  if (orderErr || !newOrder) {
    return { status: "insert_failed", error: orderErr?.message };
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
      organization_id: cred.organization_id,
      customer_address: addr || "iFood delivery",
      fee: Number(ifoodOrder.total?.deliveryFee ?? ifoodOrder.delivery?.deliveryFee ?? 0),
      status: "pendente",
    });
  }

  try {
    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cred.access_token}` },
    });
  } catch (_) { /* ignore */ }

  return { status: "created", internal_id: newOrder.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sinceIso = new Date(Date.now() - LOOKBACK_MINUTES * 60_000).toISOString();

    // Pega eventos órfãos (sem org) ou recebidos sem ainda virar pedido
    // que NÃO foram marcados como já varridos sem sucesso.
    const { data: orphans, error: selErr } = await service
      .from("ifood_event_log")
      .select("id, ifood_order_id, ifood_event_id, payload, organization_id, internal_order_id")
      .not("ifood_order_id", "is", null)
      .is("internal_order_id", null)
      .gte("received_at", sinceIso)
      .order("received_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (selErr) throw selErr;

    let recovered = 0;
    let skipped = 0;
    const details: any[] = [];
    const seenOrderIds = new Set<string>();

    for (const ev of (orphans || [])) {
      const orderId = ev.ifood_order_id as string;
      if (!orderId || seenOrderIds.has(orderId)) continue;
      seenOrderIds.add(orderId);

      const payload = (ev.payload || {}) as any;
      // Se já marcado como skipped previamente, pula
      if (payload.sweeper_status === "skipped_no_merchant") {
        skipped++;
        continue;
      }

      const merchantId = payload.merchantId || payload.merchant?.id || null;
      if (!merchantId) {
        await service.from("ifood_event_log")
          .update({ payload: { ...payload, sweeper_status: "skipped_no_merchant", swept_at: new Date().toISOString() } })
          .eq("id", ev.id);
        skipped++;
        details.push({ orderId, status: "no_merchant_id" });
        continue;
      }

      const { data: cred } = await service
        .from("ifood_credentials")
        .select("*")
        .eq("merchant_id", merchantId)
        .eq("status", "connected")
        .maybeSingle();

      if (!cred?.access_token) {
        await service.from("ifood_event_log")
          .update({ payload: { ...payload, sweeper_status: "skipped_no_merchant", swept_at: new Date().toISOString(), reason: "merchant_not_registered" } })
          .eq("id", ev.id);
        skipped++;
        details.push({ orderId, merchantId, status: "merchant_not_registered" });
        continue;
      }

      try {
        const result = await reprocessOrder(service, cred, orderId);
        if (result.status === "created" || result.status === "already_exists") {
          await service.from("ifood_event_log")
            .update({
              organization_id: cred.organization_id,
              internal_order_id: result.internal_id ?? null,
              payload: { ...payload, sweeper_status: "recovered", swept_at: new Date().toISOString() },
            })
            .eq("id", ev.id);
          recovered++;
        }
        details.push({ orderId, merchantId, ...result });
      } catch (e: any) {
        details.push({ orderId, merchantId, status: "error", error: e?.message });
      }
    }

    // health beacon
    try {
      await service.from("cron_health").upsert({
        job_name: "ifood_orphan_sweeper",
        last_success_at: new Date().toISOString(),
        last_run_count: recovered,
      }, { onConflict: "job_name" });
    } catch (_) { /* table may not have unique key — ignore */ }

    return new Response(JSON.stringify({
      success: true,
      swept: orphans?.length ?? 0,
      recovered,
      skipped,
      details,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[ifood-orphan-sweeper] error:", err);
    return new Response(JSON.stringify({ error: "Internal", details: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});