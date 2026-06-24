/**
 * whatsapp-auto-notify
 * Função unificada de automação WhatsApp via UazAPI.
 *
 * Eventos suportados:
 *   created           → cliente + dono da loja
 *   preparing         → cliente
 *   ready             → cliente
 *   out_for_delivery  → cliente
 *
 * Gates (todos devem passar):
 *   1. Plano pago ou trial ativo
 *   2. whatsapp_bot_allowed = true
 *   3. Instância UazAPI com status connected/open
 *   4. Anti-duplicata: mesmo (order_id, event) nos últimos 60s
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVENTS = ["created", "preparing", "ready", "out_for_delivery"] as const;
type Event = typeof EVENTS[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function parseField(notes: string | null, key: string): string | null {
  if (!notes) return null;
  const escapedKey = key.replace(".", "\\.");
  const match = notes.match(new RegExp(`${escapedKey}:([^|]+)`));
  return match ? match[1].trim() : null;
}

function parsePhone(notes: string | null): string | null {
  const raw = parseField(notes, "TEL");
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function parseName(notes: string | null): string {
  return parseField(notes, "CLIENTE") ?? "Cliente";
}

function fmt(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function hasAiBotAccess(org: { subscription_plan?: string | null; trial_ends_at?: string | null }): boolean {
  const plan = org.subscription_plan ?? "free";
  if (["pro", "enterprise", "lifetime"].includes(plan)) return true;
  if (org.trial_ends_at) return new Date(org.trial_ends_at) > new Date();
  return false;
}

function buildCustomerMessage(event: Event, name: string, shortId: string, tipo?: string | null): string {
  const isDelivery = tipo === "Entrega";
  switch (event) {
    case "created":
      return `Olá, ${name}! Recebemos o seu pedido *#${shortId}*. Ele está aguardando a confirmação do estabelecimento! 📝`;
    case "preparing":
      return `Seu pedido *#${shortId}* foi aceito e já entrou em preparação na nossa cozinha! 🍳`;
    case "ready":
      return isDelivery
        ? `Ótimas notícias! Seu pedido *#${shortId}* ficou pronto e está sendo embalado! 🎉`
        : `Ótimas notícias! Seu pedido *#${shortId}* está pronto para retirada! 🎉`;
    case "out_for_delivery":
      return `Seu pedido *#${shortId}* já saiu com o motoboy e está a caminho! 🚀`;
  }
}

function buildOwnerMessage(
  name: string,
  shortId: string,
  total: number,
  notes: string | null
): string {
  const tipo    = parseField(notes, "TIPO")    ?? "";
  const tel     = parseField(notes, "TEL")     ?? "";
  const end     = parseField(notes, "END\\.")  ?? "";
  const pgto    = parseField(notes, "PGTO")    ?? "";
  const frete   = parseField(notes, "FRETE")   ?? "";
  const obs     = parseField(notes, "OBS")     ?? "";

  const lines = [
    `🚨 *NOVO PEDIDO RECEBIDO!*`,
    ``,
    `📋 Pedido: *#${shortId}*`,
    `👤 Cliente: *${name}*`,
    tel     ? `📱 Tel: ${tel}` : null,
    tipo    ? `📦 Tipo: ${tipo}` : null,
    end     ? `📍 Endereço: ${end}` : null,
    frete   ? `🚚 Frete: ${frete}` : null,
    pgto    ? `💳 Pagamento: ${pgto}` : null,
    obs     ? `📝 Obs: ${obs}` : null,
    ``,
    `💰 Total: *${fmt(total)}*`,
    ``,
    `Acesse o painel para aceitar!`,
  ].filter(l => l !== null).join("\n");

  return lines;
}

// ── UazAPI sender ─────────────────────────────────────────────────────────────

async function sendMessage(
  serverUrl: string,
  token: string,
  phone: string,
  message: string
): Promise<string | null> {
  try {
    const res = await fetch(`${serverUrl}/message/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: phone, text: message }),
    });
    if (!res.ok) {
      const body = await res.text();
      return `UazAPI ${res.status}: ${body.slice(0, 200)}`;
    }
    return null; // success
  } catch (e) {
    return `fetch error: ${(e as Error).message}`;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const ok = (msg: string) =>
    new Response(JSON.stringify({ ok: true, message: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const fail = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { order_id, event } = await req.json().catch(() => ({}));

    if (!order_id || !EVENTS.includes(event)) {
      return fail("order_id e event (created|preparing|ready|out_for_delivery) obrigatórios");
    }

    // ── 1. Busca pedido ───────────────────────────────────────────────────────
    const { data: order } = await supabase
      .from("orders")
      .select("id, organization_id, notes, total_price, order_number")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) return ok("order not found, skipping");

    // ── 2. Busca org ──────────────────────────────────────────────────────────
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, whatsapp, subscription_plan, trial_ends_at, whatsapp_bot_allowed")
      .eq("id", order.organization_id)
      .maybeSingle();

    if (!org) return ok("org not found, skipping");

    // ── 3. Gate: Plano ────────────────────────────────────────────────────────
    if (!hasAiBotAccess(org)) return ok("plan does not include bot, skipping");

    // ── 4. Gate: Admin liberou ────────────────────────────────────────────────
    if (!(org as any).whatsapp_bot_allowed) return ok("bot not allowed for this org, skipping");

    // ── 5. Gate: Instância conectada ──────────────────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url, status")
      .eq("organization_id", org.id)
      .in("status", ["connected", "open"])
      .maybeSingle();

    if (!instance) return ok("no connected instance, skipping");

    // ── 6. Anti-duplicata (60s por order+event) ───────────────────────────────
    const { data: recent } = await supabase
      .from("whatsapp_notification_log" as any)
      .select("id")
      .eq("order_id", order_id)
      .eq("event", event)
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recent) return ok("duplicate suppressed (60s window)");

    // ── 7. Resolve URL do servidor UazAPI ─────────────────────────────────────
    let serverUrl = ((instance.server_url as string) || "").replace(/\/$/, "");
    if (!serverUrl) {
      const { data: pc } = await supabase
        .from("platform_config")
        .select("uazapi_server_url")
        .eq("id", "singleton")
        .maybeSingle();
      serverUrl = ((pc as any)?.uazapi_server_url || "").replace(/\/$/, "")
        || Deno.env.get("UAZAPI_SERVER_URL")?.replace(/\/$/, "")
        || "https://free.uazapi.com";
    }

    const token = instance.instance_token;
    const shortId = order.order_number?.toString()
      ?? order.id.slice(0, 8).toUpperCase();
    const customerName = parseName(order.notes);
    const customerPhone = parsePhone(order.notes);
    const tipo = parseField(order.notes, "TIPO");
    // Busca itens para calcular total correto com desconto
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("price, quantity")
      .eq("order_id", order.id);
    const itemsTotal = (orderItems ?? []).reduce((s: number, i: any) => s + (i.price ?? 0) * i.quantity, 0);
    const discount = (order as any).discount_value ?? 0;
    const total = Math.max(0, ((order as any).total_price ?? itemsTotal) - discount);
    const results: string[] = [];
    let anyFailed = false;

    // ── 8. Envios ─────────────────────────────────────────────────────────────

    // Mensagem para o CLIENTE
    if (customerPhone) {
      const phone = formatPhone(customerPhone);
      const msg = buildCustomerMessage(event, customerName, shortId, tipo);
      const err = await sendMessage(serverUrl, token, phone, msg);
      if (err) { anyFailed = true; results.push(`customer:${err}`); }
      else results.push("customer:sent");
    } else {
      results.push("customer:no_phone");
    }

    // Mensagem para o DONO (apenas no evento 'created')
    if (event === "created") {
      const ownerRaw = ((org as any).whatsapp || "").replace(/\D/g, "");
      if (ownerRaw.length >= 10) {
        const ownerPhone = formatPhone(ownerRaw);
        const ownerMsg = buildOwnerMessage(customerName, shortId, total, order.notes);
        const err = await sendMessage(serverUrl, token, ownerPhone, ownerMsg);
        if (err) { anyFailed = true; results.push(`owner:${err}`); }
        else results.push("owner:sent");
      } else {
        results.push("owner:no_phone");
      }
    }

    // ── 9. Grava log ──────────────────────────────────────────────────────────
    await supabase.from("whatsapp_notification_log" as any).insert({
      order_id,
      event,
      status: anyFailed ? "failed" : "sent",
      error: anyFailed ? results.join(" | ") : null,
    });

    return ok(`event=${event} results=${results.join(",")}`);

  } catch (err) {
    console.error("[whatsapp-auto-notify] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
