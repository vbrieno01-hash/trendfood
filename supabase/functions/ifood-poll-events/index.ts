import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

// ============= HELPERS COMPARTILHADOS =============

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

  // CPF/CNPJ separados (decisão por dígitos)
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

  // Pagamento + bandeira (req #4)
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

  // Cupom diferenciado iFood vs Loja (req #5)
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

  // resolve internal order
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
      // Salvar UNITÁRIO (qty é multiplicada no front/recibo)
      price: it.unitPrice != null
        ? Number(it.unitPrice)
        : Number(it.totalPrice ?? 0) / (Number(it.quantity ?? 1) || 1),
      quantity: it.quantity || 1,
    }));
    if (rows.length) await supabase.from("order_items").insert(rows);
  }

  await supabase.from("orders").update({
    ifood_patched_at: new Date().toISOString(),
    ifood_synced_externally: true,
  }).eq("id", order.id);

  // Comanda de atualização pra impressão
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

// Map de status iFood vindo de fora → status interno
const EXTERNAL_STATUS_MAP: Record<string, string> = {
  CFM: "preparing",
  CONFIRMED: "preparing",
  RPR: "preparing",
  STARTED: "preparing",
  RTP: "ready",
  READY_TO_PICKUP: "ready",
  DSP: "delivered",
  DISPATCHED: "delivered",
  CON: "delivered",
  CONCLUDED: "delivered",
  CAN: "cancelled",
  CANCELLED: "cancelled",
};

// Insere evento. Retorna true se já existia (duplicata) e deve ser pulado.
async function logEventDedup(
  supabase: any,
  orgId: string | null,
  event: any,
  source: string,
  internalOrderId?: string | null,
  extraPayload?: Record<string, any>,
): Promise<{ duplicate: boolean }> {
  if (!event?.id) {
    // Sem id: insere sem dedup (sempre processar)
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

async function processNewOrder(supabase: any, cred: any, token: string, event: any): Promise<{ confirmLatencyMs: number | null; internalOrderId: string | null }> {
  const orderId = event.orderId || event.metadata?.orderId;
  if (!orderId) return { confirmLatencyMs: null, internalOrderId: null };

  const { data: existing } = await supabase
    .from("orders").select("id")
    .eq("organization_id", cred.organization_id)
    .eq("gateway_payment_id", `ifood:${orderId}`)
    .maybeSingle();
  if (existing) return { confirmLatencyMs: null, internalOrderId: existing.id };

  const orderRes = await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!orderRes.ok) return { confirmLatencyMs: null, internalOrderId: null };
  const ifoodOrder = await orderRes.json();
  const isPickup = String(ifoodOrder.orderType || "DELIVERY").toUpperCase() === "TAKEOUT";

  const scheduledFor = extractScheduledFor(ifoodOrder);
  const { data: newOrder, error: orderErr } = await supabase.from("orders").insert({
    organization_id: cred.organization_id,
    table_number: 0,
    status: "pending",
    notes: buildOrderNotes(ifoodOrder),
    payment_method: ifoodOrder.payments?.methods?.[0]?.method || "ifood",
    gateway_payment_id: `ifood:${orderId}`,
    ifood_synced_externally: true, // criação veio do iFood
    ifood_scheduled_for: scheduledFor,
    ifood_order_type: isPickup ? "TAKEOUT" : "DELIVERY",
    ifood_delivery_localizer: ifoodOrder.customer?.phone?.localizer ?? null,
  }).select("id").single();
  if (orderErr || !newOrder) {
    // Race com webhook: pedido já foi criado por outro caminho (unique index 23505)
    if ((orderErr as any)?.code === "23505") {
      const { data: dup } = await supabase
        .from("orders").select("id")
        .eq("organization_id", cred.organization_id)
        .eq("gateway_payment_id", `ifood:${orderId}`)
        .maybeSingle();
      if (dup) return { confirmLatencyMs: null, internalOrderId: dup.id };
    }
    return { confirmLatencyMs: null, internalOrderId: null };
  }

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

  // Confirma no iFood + mede latência (req #2)
  const t0 = Date.now();
  let latency: number | null = null;
  try {
    await fetch(`${IFOOD_API}/order/v1.0/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    latency = Date.now() - t0;
  } catch (_) {
    latency = Date.now() - t0;
  }
  return { confirmLatencyMs: latency, internalOrderId: newOrder.id };
}

// Sincroniza status quando vem de fora (req #9). Marca flag pra evitar loop com ifood-update-status.
async function syncExternalStatus(supabase: any, orgId: string, ifoodOrderId: string, newStatus: string) {
  if (!ifoodOrderId) return null;
  const { data: order } = await supabase.from("orders")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("gateway_payment_id", `ifood:${ifoodOrderId}`)
    .maybeSingle();
  if (!order) return null;
  if (order.status === newStatus) return order.id;

  const update: Record<string, any> = {
    status: newStatus,
    ifood_synced_externally: true,
  };
  if (newStatus === "cancelled") update.cancellation_reason = "Cancelado via iFood";

  await supabase.from("orders").update(update).eq("id", order.id);
  return order.id;
}

// ============= MAIN HANDLER (POLLING) =============

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

      // iFood retorna 200 com corpo vazio (ou 204) quando não há eventos novos.
      // Chamar .json() direto nesse caso estoura "Unexpected end of JSON input".
      let events: any[] = [];
      if (eventsRes.status !== 204) {
        const raw = (await eventsRes.text()).trim();
        if (raw.length > 0) {
          try {
            const parsed = JSON.parse(raw);
            events = Array.isArray(parsed) ? parsed : [];
          } catch {
            results.push({ org: cred.organization_id, error: "invalid_json" });
            continue;
          }
        }
      }
      if (events.length === 0) {
        results.push({ org: cred.organization_id, events: 0 });
        continue;
      }

      const ackIds: string[] = [];
      let processed = 0, duplicates = 0;

      for (const event of events) {
        // Sempre ack, mesmo duplicado/keepalive (req #1, #11)
        if (event.id) ackIds.push(event.id);

        // Dedup por event.id (req #8)
        const { duplicate } = await logEventDedup(supabase, cred.organization_id, event, "polling");
        if (duplicate) { duplicates++; continue; }
        processed++;

        const code = String(event.code || event.fullCode || "").toUpperCase();

        if (code === "KEEPALIVE") continue;

        // Negociação (Plataforma de Negociação iFood) — captura e persiste
        if (code.startsWith("HANDSHAKE") || code === "DISPUTE" || code.includes("DISPUTE")) {
          try { await upsertDispute(supabase, cred.organization_id, event); } catch (e) { console.error("upsertDispute", e); }
          continue;
        }

        // Modificação de pedido pós-confirmação (req #16)
        if (code === "ORDER_PATCHED" || code === "PTC" || code === "PATCH") {
          try { await applyOrderPatch(supabase, cred.organization_id, event.orderId, event); } catch (e) { console.error("applyOrderPatch", e); }
          continue;
        }

        // Entregador iFood atribuído (req #12)
        if (code === "ASSIGN_DRIVER" || code === "DRIVER_ASSIGNED" || code === "ASSIGNED_DRIVER") {
          try { await handleAssignDriver(supabase, cred.organization_id, event.orderId, event); } catch (e) { console.error("handleAssignDriver", e); }
          continue;
        }

        if (code === "PLC" || code === "PLACED" || code === "CFM" || code === "CONFIRMED") {
          const { confirmLatencyMs, internalOrderId } = await processNewOrder(supabase, cred, accessToken, event);
          if (internalOrderId && confirmLatencyMs != null) {
            await supabase.from("ifood_event_log")
              .update({ payload: { ...event, confirm_latency_ms: confirmLatencyMs }, internal_order_id: internalOrderId })
              .eq("ifood_event_id", event.id);
          }
          continue;
        }

        // Sync de status externo (req #9)
        const mapped = EXTERNAL_STATUS_MAP[code];
        if (mapped) {
          await syncExternalStatus(supabase, cred.organization_id, event.orderId, mapped);
        }
      }

      // Acknowledgment em lote (req #1)
      if (ackIds.length > 0) {
        await fetch(`${IFOOD_API}/events/v1.0/events/acknowledgment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(ackIds.map((id) => ({ id }))),
        });
      }

      results.push({ org: cred.organization_id, events: events.length, acked: ackIds.length, processed, duplicates });
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
