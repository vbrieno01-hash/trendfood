import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";

function parsePhoneFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/TEL:([^|]+)/);
  if (!m) return null;
  const d = m[1].replace(/\D/g, "");
  return d.length >= 10 ? d : null;
}
function parseCustomerNameFromNotes(notes: string | null): string {
  if (!notes) return "Cliente";
  const m = notes.match(/CLIENTE:([^|]+)/);
  return m ? m[1].trim() : "Cliente";
}
function parseOrderTypeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/TIPO:([^|]+)/);
  return m ? m[1].trim() : null;
}
function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
function buildMessage(event: string, name: string, orderId: string, notes: string | null): string {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const tipo = parseOrderTypeFromNotes(notes);
  const isDelivery = tipo === "Entrega";
  switch (event) {
    case "preparing": return `Olá, ${name}! Seu pedido *#${shortId}* foi recebido pela cozinha e já começou a ser preparado! 🍳`;
    case "ready": return isDelivery
      ? `Ótimas notícias, ${name}! Seu pedido *#${shortId}* ficou pronto e está sendo embalado! 🎉`
      : `Ótimas notícias, ${name}! Seu pedido *#${shortId}* está pronto para retirada! 🎉`;
    case "out_for_delivery": return `Seu pedido *#${shortId}* já saiu com o nosso motoboy e está a caminho! 🚀`;
    default: return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ok = (msg: string) => new Response(JSON.stringify({ ok: true, message: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { order_id, event } = await req.json();
    if (!order_id || !["preparing", "ready", "out_for_delivery"].includes(event)) {
      return new Response(JSON.stringify({ error: "order_id e event obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: order } = await supabase.from("orders").select("id, organization_id, notes").eq("id", order_id).maybeSingle();
    if (!order) return ok("order not found");

    const { data: org } = await supabase.from("organizations").select("id, name, user_id").eq("id", order.organization_id).eq("user_id", user.id).maybeSingle();
    if (!org) return ok("org not found/forbidden");

    const { data: instance } = await supabase.from(FREE_TABLE)
      .select("instance_token, server_url, status, trial_expired")
      .eq("organization_id", org.id)
      .in("status", ["connected", "open"])
      .maybeSingle();
    if (!instance) return ok("no connected free instance");
    if ((instance as any).trial_expired) return ok("free trial expired");

    // Anti-duplicata 60s
    const { data: recent } = await supabase.from("whatsapp_notification_log" as any)
      .select("id").eq("order_id", order_id).eq("event", event).eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString()).limit(1).maybeSingle();
    if (recent) return ok("duplicate suppressed");

    const rawPhone = parsePhoneFromNotes(order.notes);
    if (!rawPhone) {
      await supabase.from("whatsapp_notification_log" as any).insert({ order_id, event, status: "failed", error: "sem telefone nas notes" });
      return ok("no phone");
    }
    const phone = formatPhone(rawPhone);
    const name = parseCustomerNameFromNotes(order.notes);
    const message = buildMessage(event, name, order_id, order.notes);
    if (!message) return ok("unknown event");

    const serverUrl = ((instance as any).server_url || Deno.env.get("UAZAPI_FREE_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");

    let sendError: string | null = null;
    try {
      const res = await fetch(`${serverUrl}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: (instance as any).instance_token },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!res.ok) {
        const body = await res.text();
        sendError = `UazAPI Free ${res.status}: ${body.slice(0, 200)}`;
        if (res.status === 401 || res.status === 403) {
          await supabase.from(FREE_TABLE).update({ status: "disconnected", connected_at: null, phone_connected: null }).eq("organization_id", org.id);
        }
      }
    } catch (e) { sendError = `fetch err: ${(e as Error).message}`; }

    await supabase.from("whatsapp_notification_log" as any).insert({ order_id, event, status: sendError ? "failed" : "sent", error: sendError ?? null });
    return ok(sendError ? `failed: ${sendError}` : `sent to ${phone}`);
  } catch (err) {
    console.error("[uazapi-free-notify-customer] err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});