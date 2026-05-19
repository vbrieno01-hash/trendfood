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
  // Pedido de homologação/teste — sinaliza pro operador
  if (io.isTest === true) parts.push(`TESTE:SIM`);
  const orderType = String(io.orderType || "DELIVERY").toUpperCase();
  const isPickup = orderType === "TAKEOUT";
  parts.push(`TIPO:${isPickup ? "Retirada" : "Entrega"}`);
  const cust = io.customer || {};
  if (cust.name) parts.push(`CLIENTE:${cust.name}`);
  const phone = cust.phone?.number || cust.phone || "";
  if (phone) parts.push(`TEL:${phone}`);
  const doc = String(cust.documentNumber || cust.taxPayerIdentificationNumber || "").replace(/\D/g, "");
  if (doc) {
    if (doc.length === 14) parts.push(`CNPJ:${doc}`);
    else parts.push(`CPF:${doc}`);
  }
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
  // Pickup/handover code: SÓ delivery.pickupCode (não confundir com takeoutDateTime, que é DATA)
  const pickupCode = io.delivery?.pickupCode || io.pickupCode;
  if (pickupCode) parts.push(`COLETA:${pickupCode}`);

  const pay = io.payments?.methods?.[0] || {};
  const method = pay.method || pay.type || "iFood";
  const prepaid = io.payments?.prepaid === true || pay.prepaid === true;
  parts.push(`PGTO:${prepaid ? "Pago no iFood" : method}`);
  const brand = pay.card?.brand || pay.brand;
  if (brand && /CREDIT|DEBIT|CARD/i.test(method)) parts.push(`BANDEIRA:${brand}`);
  const changeFor = pay.cash?.changeFor;
  if (changeFor && Number(changeFor) > 0) parts.push(`TROCO:${fmtMoney(changeFor)}`);

  // Dados fiscais da transação (NFe: cAut + CNPJ intermediador)
  const tx = pay.transaction || {};
  if (tx.authorizationCode) parts.push(`AUT:${String(tx.authorizationCode).slice(0, 32)}`);
  if (tx.acquirerDocument) parts.push(`CNPJ_INTERMED:${String(tx.acquirerDocument).replace(/\D/g, "").slice(0, 14)}`);

  // Taxas adicionais do iFood (NÃO somar como receita do lojista — só exibir)
  const fees = io.additionalFees || [];
  if (Array.isArray(fees) && fees.length) {
    const labels = fees
      .map((f: any) => `${f.description || f.type || "Taxa"} ${fmtMoney(f.value ?? 0)}`)
      .join("; ");
    if (labels) parts.push(`TAXAS_IFOOD:${labels}`);
  }

  const benefits = io.benefits || [];
  if (Array.isArray(benefits) && benefits.length) {
    const labels: string[] = [];
    for (const b of benefits) {
      const sponsors = b.sponsorshipValues || [];
      if (Array.isArray(sponsors) && sponsors.length) {
        for (const s of sponsors) {
          const who = String(s.name || "OUTRO").toUpperCase().includes("IFOOD") ? "IFOOD" : "LOJA";
          labels.push(`${who} -${fmtMoney(s.value ?? 0)}`);
        }
      } else {
        labels.push(`${b.target || "Voucher"} -${fmtMoney(b.value ?? 0)}`);
      }
    }
    if (labels.length) parts.push(`CUPOM:${labels.join("; ")}`);
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

function extractScheduledFor(io: any): string | null {
  if (String(io?.orderTiming).toUpperCase() !== "SCHEDULED") return null;
  const raw = io?.schedule?.deliveryDateTimeStart
    || io?.schedule?.scheduledDateTimeStart
    || io?.scheduledDateTime
    || null;
  if (!raw) return null;
  try { return new Date(raw).toISOString(); } catch { return null; }
}

async function upsertDispute(supabase: any, orgId: string, event: any) {
  const md = event?.metadata || {};
  const disputeId = md.disputeId || md.id || event?.disputeId || event?.id;
  if (!disputeId) return;
  const ifoodOrderId = event?.orderId || md.orderId || null;
  const expiresAt = md.expiresAt || md.expireAt || null;

  let internalOrderId: string | null = null;
  if (ifoodOrderId) {
    const { data: ord } = await supabase.from("orders").select("id")
      .eq("organization_id", orgId)
      .eq("gateway_payment_id", `ifood:${ifoodOrderId}`).maybeSingle();
    internalOrderId = ord?.id ?? null;
  }

  await supabase.from("ifood_disputes").upsert({
    organization_id: orgId,
    dispute_id: String(disputeId),
    ifood_order_id: ifoodOrderId,
    order_id: internalOrderId,
    dispute_type: event?.code || event?.fullCode || md.type || null,
    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    payload: event,
    status: "open",
  }, { onConflict: "dispute_id" } as any);
}

async function applyOrderPatch(supabase: any, orgId: string, ifoodOrderId: string, event: any) {
  if (!ifoodOrderId) return null;
  const { data: order } = await supabase.from("orders")
    .select("id").eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`).maybeSingle();
  if (!order) return null;

  const md = event?.metadata || {};
  const changeType = String(md.changeType || md.action || "").toUpperCase();
  const items: any[] = Array.isArray(md.items) ? md.items : [];

  if (changeType === "DELETE_ITEMS" && items.length) {
    for (const it of items) {
      const namePrefix = String(it.name || "").slice(0, 60);
      if (!namePrefix) continue;
      await supabase.from("order_items")
        .delete()
        .eq("order_id", order.id)
        .ilike("name", `${namePrefix}%`);
    }
  } else if (changeType === "ADD_ITEMS" && items.length) {
    const rows = items.map((it: any) => ({
      order_id: order.id,
      name: String(it.name || "Item iFood") + (it.observations ? ` | Obs: ${String(it.observations).slice(0, 200)}` : ""),
      price: Number(it.totalPrice ?? it.unitPrice ?? 0),
      quantity: it.quantity || 1,
    }));
    if (rows.length) await supabase.from("order_items").insert(rows);
  }

  await supabase.from("orders").update({
    ifood_patched_at: new Date().toISOString(),
    ifood_synced_externally: true,
  }).eq("id", order.id);

  const lines = [
    "*** ATUALIZACAO DE PEDIDO iFOOD ***",
    `Tipo: ${changeType || "-"}`,
    ...items.map((it: any) => ` ${changeType === "DELETE_ITEMS" ? "-" : "+"} ${it.quantity || 1}x ${it.name || "Item"}`),
    "",
    "Atualize a producao!",
  ].join("\n");
  await supabase.from("fila_impressao").insert({
    organization_id: orgId,
    order_id: order.id,
    conteudo_txt: lines,
    status: "pendente",
  });
  return order.id;
}

async function handleAssignDriver(supabase: any, orgId: string, ifoodOrderId: string, event: any) {
  if (!ifoodOrderId) return null;
  const md = event?.metadata || {};
  const driverName = md.driverName || md.driver?.name || event?.driverName || null;
  await supabase.from("orders").update({
    ifood_driver_assigned_at: new Date().toISOString(),
    ifood_driver_name: driverName,
    ifood_synced_externally: true,
  })
    .eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`);
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

const EXTERNAL_STATUS_MAP: Record<string, string> = {
  CFM: "preparing", CONFIRMED: "preparing",
  RPR: "preparing", STARTED: "preparing",
  RTP: "ready", READY_TO_PICKUP: "ready",
  DSP: "delivered", DISPATCHED: "delivered",
  CON: "delivered", CONCLUDED: "delivered",
  CAN: "cancelled", CANCELLED: "cancelled",
};

async function logEventDedup(
  supabase: any,
  orgId: string | null,
  event: any,
  source: string,
  internalOrderId?: string | null,
  extraPayload?: Record<string, any>,
): Promise<{ duplicate: boolean }> {
  if (!event?.id) {
    try {
      await supabase.from("ifood_event_log").insert({
        organization_id: orgId,
        ifood_event_id: null,
        ifood_order_id: event?.orderId ?? null,
        ifood_display_id: event?.displayId ?? null,
        code: event?.code ?? event?.fullCode ?? "UNKNOWN",
        payload: { ...event, ...extraPayload },
        internal_order_id: internalOrderId ?? null,
        source,
      });
    } catch (_) {}
    return { duplicate: false };
  }
  const { error } = await supabase.from("ifood_event_log").insert({
    organization_id: orgId,
    ifood_event_id: event.id,
    ifood_order_id: event.orderId ?? null,
    ifood_display_id: event.displayId ?? null,
    code: event.code ?? event.fullCode ?? "UNKNOWN",
    payload: { ...event, ...extraPayload },
    internal_order_id: internalOrderId ?? null,
    source,
  });
  if (error && (error.code === "23505" || /duplicate/i.test(error.message))) {
    return { duplicate: true };
  }
  if (orgId) {
    await supabase.from("ifood_credentials")
      .update({ last_event_at: new Date().toISOString() })
      .eq("organization_id", orgId);
  }
  return { duplicate: false };
}

async function handleNewOrder(supabase: any, creds: any, event: any): Promise<{ confirmLatencyMs: number | null; internalOrderId: string | null }> {
  const { orderId } = event;
  if (!creds.access_token) return { confirmLatencyMs: null, internalOrderId: null };

  const { data: existing } = await supabase
    .from("orders").select("id")
    .eq("organization_id", creds.organization_id)
    .eq("gateway_payment_id", `ifood:${orderId}`)
    .maybeSingle();
  if (existing) return { confirmLatencyMs: null, internalOrderId: existing.id };

  const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${creds.access_token}` },
  });
  if (!orderRes.ok) {
    console.error("[ifood-webhook] Failed to fetch order:", await orderRes.text());
    return { confirmLatencyMs: null, internalOrderId: null };
  }
  const ifoodOrder = await orderRes.json();
  const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";

  const { data: order, error: orderError } = await supabase.from("orders").insert({
    organization_id: creds.organization_id,
    table_number: 0,
    status: "pending",
    payment_method: ifoodOrder.payments?.methods?.[0]?.method ?? "ifood",
    notes: buildOrderNotes(ifoodOrder),
    gateway_payment_id: `ifood:${orderId}`,
    ifood_synced_externally: true,
    ifood_order_type: isPickup ? "TAKEOUT" : "DELIVERY",
    ifood_scheduled_for: extractScheduledFor(ifoodOrder),
  }).select("id").single();
  if (orderError || !order) {
    // Race com poller: pedido já foi criado por outro caminho (unique index 23505)
    if ((orderError as any)?.code === "23505") {
      const { data: dup } = await supabase
        .from("orders").select("id")
        .eq("organization_id", creds.organization_id)
        .eq("gateway_payment_id", `ifood:${orderId}`)
        .maybeSingle();
      if (dup) return { confirmLatencyMs: null, internalOrderId: dup.id };
    }
    console.error("[ifood-webhook] Failed to create order:", orderError);
    return { confirmLatencyMs: null, internalOrderId: null };
  }

  const items = (ifoodOrder.items ?? []).map((item: any) => ({
    order_id: order.id,
    name: buildItemName(item),
    price: Number(item.totalPrice ?? item.unitPrice ?? 0),
    quantity: item.quantity ?? 1,
    menu_item_id: null,
  }));
  if (items.length > 0) await supabase.from("order_items").insert(items);

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

  const t0 = Date.now();
  let latency: number | null = null;
  try {
    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    latency = Date.now() - t0;
  } catch (_) {
    latency = Date.now() - t0;
  }
  return { confirmLatencyMs: latency, internalOrderId: order.id };
}

async function syncExternalStatus(
  supabase: any,
  orgId: string,
  ifoodOrderId: string,
  newStatus: string,
  rawCode: string,
) {
  if (!ifoodOrderId) return null;
  const { data: order } = await supabase.from("orders")
    .select("id, status, ifood_dispatched_at, ifood_concluded_at")
    .eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`)
    .maybeSingle();
  if (!order) return null;

  const isDispatch = rawCode === "DSP" || rawCode === "DISPATCHED";
  const isConcluded = rawCode === "CON" || rawCode === "CONCLUDED";

  const update: Record<string, any> = { ifood_synced_externally: true };
  if (isDispatch && !order.ifood_dispatched_at) {
    update.ifood_dispatched_at = new Date().toISOString();
  }
  if (isConcluded && !order.ifood_concluded_at) {
    update.ifood_concluded_at = new Date().toISOString();
  }
  if (order.status !== newStatus) {
    update.status = newStatus;
    if (newStatus === "cancelled") update.cancellation_reason = "Cancelado via iFood";
  }

  // Nada novo a aplicar
  if (Object.keys(update).length === 1) return order.id;

  await supabase.from("orders").update(update).eq("id", order.id);

  if (newStatus === "cancelled") {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-merchant-telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId, event_type: "ifood_cancelled", ifood_order_id: ifoodOrderId }),
      });
    } catch (_) {}
  }
  return order.id;
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: true, message: "No body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    console.log("[ifood-webhook] Received:", JSON.stringify(body).slice(0, 300));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const events = Array.isArray(body) ? body : [body];

    // Coleta tokens por merchant pra acknowledgment depois
    const tokensByMerchant = new Map<string, { token: string | null; ackIds: string[] }>();

    for (const event of events) {
      const { code: rawCode, orderId, merchantId } = event;
      const code = String(rawCode || event.fullCode || "").toUpperCase();

      if (!merchantId) {
        console.warn("[ifood-webhook] Event without merchantId, skipping");
        // Sem merchantId: log sem ifood_event_id pra NÃO bloquear o polling depois
        await logEventDedup(supabase, null, { ...event, id: null }, "webhook");
        continue;
      }

      const { data: creds } = await supabase
        .from("ifood_credentials")
        .select("organization_id, access_token, merchant_id")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (!creds) {
        console.warn("[ifood-webhook] No org for merchantId:", merchantId);
        // Sem org pareada: log SEM ifood_event_id (id=null) pra liberar o polling
        // a reprocessar esse mesmo evento quando a credencial for corrigida
        await logEventDedup(supabase, null, { ...event, id: null }, "webhook", null, {
          orphan_reason: "no_org_for_merchant",
          original_event_id: event.id,
        });
        continue;
      }

      // Coleta event.id pra ack (req #11)
      if (event.id) {
        const entry = tokensByMerchant.get(merchantId) ?? { token: creds.access_token, ackIds: [] };
        entry.ackIds.push(event.id);
        entry.token = creds.access_token;
        tokensByMerchant.set(merchantId, entry);
      }

      // Dedup (req #8)
      const { duplicate } = await logEventDedup(supabase, creds.organization_id, event, "webhook");
      if (duplicate) continue;

      if (code === "KEEPALIVE") continue;
      if (code.startsWith("HANDSHAKE") || code === "DISPUTE" || code.includes("DISPUTE")) {
        try { await upsertDispute(supabase, creds.organization_id, event); } catch (e) { console.error("upsertDispute", e); }
        continue;
      }
      if (code === "ORDER_PATCHED" || code === "PTC" || code === "PATCH") {
        try { await applyOrderPatch(supabase, creds.organization_id, orderId, event); } catch (e) { console.error("applyOrderPatch", e); }
        continue;
      }
      if (code === "ASSIGN_DRIVER" || code === "DRIVER_ASSIGNED" || code === "ASSIGNED_DRIVER") {
        try { await handleAssignDriver(supabase, creds.organization_id, orderId, event); } catch (e) { console.error("handleAssignDriver", e); }
        continue;
      }

      if (code === "PLC" || code === "PLACED" || code === "CFM" || code === "CONFIRMED") {
        const { confirmLatencyMs, internalOrderId } = await handleNewOrder(supabase, creds, event);
        if (internalOrderId && confirmLatencyMs != null && event.id) {
          await supabase.from("ifood_event_log")
            .update({ payload: { ...event, confirm_latency_ms: confirmLatencyMs }, internal_order_id: internalOrderId })
            .eq("ifood_event_id", event.id);
        }
        continue;
      }

      const mapped = EXTERNAL_STATUS_MAP[code];
      if (mapped) {
        await syncExternalStatus(supabase, creds.organization_id, orderId, mapped, code);
      } else if (code === "CCAN" || code === "CONSUMER_CANCELLATION_REQUESTED" || code === "CANR" || code === "CANCELLATION_REQUESTED") {
        // Cliente (ou iFood) solicitou cancelamento — marca pra lojista decidir na Cozinha.
        await supabase.from("orders").update({
          ifood_cancellation_requested_at: new Date().toISOString(),
        })
          .eq("organization_id", creds.organization_id)
          .eq("gateway_payment_id", `ifood:${orderId}`);
      } else {
        console.log("[ifood-webhook] Unhandled code:", code, "order:", orderId);
      }
    }

    // Acknowledgment de todos eventos recebidos via webhook (req #11)
    for (const [_merchantId, entry] of tokensByMerchant) {
      if (!entry.token || entry.ackIds.length === 0) continue;
      try {
        await fetch(`${IFOOD_API}/events/v1.0/events/acknowledgment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${entry.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(entry.ackIds.map((id) => ({ id }))),
        });
      } catch (err) {
        console.error("[ifood-webhook] ack failed:", err);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202,
    });
  } catch (err) {
    console.error("[ifood-webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: corsHeaders,
    });
  }
});
