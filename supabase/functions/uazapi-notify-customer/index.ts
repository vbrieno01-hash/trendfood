import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Parsers (replicam src/lib/whatsappNotify.ts no servidor) ──────────────────

function parsePhoneFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/TEL:([^|]+)/);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits;
}

function parseCustomerNameFromNotes(notes: string | null): string {
  if (!notes) return "Cliente";
  const match = notes.match(/CLIENTE:([^|]+)/);
  return match ? match[1].trim() : "Cliente";
}

function parseOrderTypeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/TIPO:([^|]+)/);
  return match ? match[1].trim() : null;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildMessage(event: string, customerName: string, orderId: string, notes: string | null): string {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const tipo = parseOrderTypeFromNotes(notes);
  const isDelivery = tipo === "Entrega";

  switch (event) {
    case "preparing":
      return `Olá, ${customerName}! Seu pedido *#${shortId}* foi recebido pela cozinha e já começou a ser preparado! 🍳`;
    case "ready":
      return isDelivery
        ? `Ótimas notícias, ${customerName}! Seu pedido *#${shortId}* ficou pronto e está sendo embalado! 🎉`
        : `Ótimas notícias, ${customerName}! Seu pedido *#${shortId}* está pronto para retirada! 🎉`;
    case "out_for_delivery":
      return `Seu pedido *#${shortId}* já saiu com o nosso motoboy e está a caminho! 🚀 Em breve estará aí.`;
    default:
      return "";
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── Auth: precisa de lojista logado ──────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ok = (msg: string) =>
    new Response(JSON.stringify({ ok: true, message: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { order_id, event } = await req.json();
    if (!order_id || !["preparing", "ready", "out_for_delivery"].includes(event)) {
      return new Response(JSON.stringify({ error: "order_id e event obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Busca pedido + org ────────────────────────────────────────────────
    const { data: order } = await supabase
      .from("orders")
      .select("id, organization_id, notes")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) return ok("order not found, skipping");

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, user_id, subscription_plan, trial_ends_at, whatsapp_bot_allowed")
      .eq("id", order.organization_id)
      .eq("user_id", user.id) // ownership check
      .maybeSingle();

    if (!org) return ok("org not found or forbidden, skipping");

    // ── Gate: Admin liberou esta loja (independe de plano) ────────────────
    if (!(org as any).whatsapp_bot_allowed) return ok("whatsapp_bot not allowed for this org, skipping");

    // ── Gate 3: Instância UazAPI conectada ───────────────────────────────
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("instance_token, server_url, status")
      .eq("organization_id", org.id)
      .in("status", ["connected", "open"])
      .maybeSingle();

    if (!instance) return ok("no connected whatsapp instance, skipping");

    // ── Anti-duplicata: mesmo evento nos últimos 60s ──────────────────────
    const { data: recent } = await supabase
      .from("whatsapp_notification_log" as any)
      .select("id")
      .eq("order_id", order_id)
      .eq("event", event)
      .eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(1)
      .maybeSingle();

    if (recent) return ok("duplicate notification suppressed (60s window)");

    // ── Extrai telefone do cliente ────────────────────────────────────────
    const rawPhone = parsePhoneFromNotes(order.notes);
    if (!rawPhone) {
      await supabase.from("whatsapp_notification_log" as any).insert({
        order_id, event, status: "failed", error: "telefone não encontrado nas notes",
      });
      return ok("no phone in notes, logged and skipping");
    }
    const phone = formatPhone(rawPhone);
    const customerName = parseCustomerNameFromNotes(order.notes);
    const message = buildMessage(event, customerName, order_id, order.notes);
    if (!message) return ok("unknown event, skipping");

    // ── Busca URL do servidor UazAPI ──────────────────────────────────────
    // server_url pode ser null se coluna nao existia ainda — sempre faz fallback para platform_config
    let serverUrl = ((instance as any).server_url || "").replace(/\/$/, "");
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

    // ── Envio via UazAPI /send/text ────────────────────────────────────
    let sendError: string | null = null;
    let sendCode: string | null = null;
    try {
      const res = await fetch(`${serverUrl}/send/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: instance.instance_token,
        },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!res.ok) {
        const body = await res.text();
        sendError = `UazAPI ${res.status}: ${body.slice(0, 200)}`;
        sendCode = res.status === 401 || res.status === 403
          ? `WA-NOTIFY-CUSTOMER-${res.status}`
          : "WA-NOTIFY-CUSTOMER-UAZAPI";
        const bodyLower = body.toLowerCase();
        const sessionDead =
          bodyLower.includes("session is not reconnectable") ||
          bodyLower.includes("whatsapp disconnected");
        if (res.status === 401 || res.status === 403 || sessionDead) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: "disconnected", connected_at: null, phone_connected: null })
            .eq("organization_id", org.id);
          if (sessionDead) sendCode = "WA-NOTIFY-CUSTOMER-SESSION-DEAD";
        }
      }
    } catch (e) {
      sendError = `fetch error: ${(e as Error).message}`;
      sendCode = "WA-NOTIFY-CUSTOMER-NETWORK";
    }

    // ── Grava log (sucesso ou falha) ──────────────────────────────────────
    await supabase.from("whatsapp_notification_log" as any).insert({
      order_id,
      event,
      status: sendError ? "failed" : "sent",
      error: sendError ?? null,
    });

    if (sendError) {
      console.error(`[uazapi-notify] failed order=${order_id} event=${event}:`, sendError);
      await supabase.from("client_error_logs").insert({
        organization_id: org.id,
        source: "uazapi-notify-customer",
        code: sendCode ?? "WA-NOTIFY-CUSTOMER-UNKNOWN",
        error_message: sendError,
        metadata: { order_id, event, serverUrl, endpoint: "/send/text" },
      });
      return ok(`notification failed but logged: ${sendError}`);
    }

    return ok(`notification sent to ${phone} for event=${event}`);

  } catch (err) {
    console.error("[uazapi-notify] unexpected error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
