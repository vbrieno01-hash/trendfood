import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
function fmt(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }

function buildOwnerMessage(order: { id: string; notes: string | null; total_price?: number | null }, items: { name: string; quantity: number; price: number }[], orgName: string): string {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const notes = order.notes ?? "";
  const get = (k: string) => { const m = notes.match(new RegExp(`${k}:([^|]+)`)); return m ? m[1].trim() : null; };
  const tipo = get("TIPO") ?? "Pedido";
  const cliente = get("CLIENTE") ?? "Cliente";
  const tel = get("TEL") ?? "";
  const endereco = get("END\\.");
  const frete = get("FRETE");
  const pgto = get("PGTO") ?? "—";
  const obs = get("OBS");
  const agendado = get("AGENDADO");
  const itemLines = items.map((i) => `  • ${i.quantity}x ${i.name} — ${fmt(i.price * i.quantity)}`).join("\n");
  const total = order.total_price ?? items.reduce((s, i) => s + i.price * i.quantity, 0);
  return [
    `🛎️ *Novo Pedido — ${orgName}*`, `📋 *#${shortId}*`, ``,
    `👤 *Cliente:* ${cliente}`, tel ? `📱 *Tel:* ${tel}` : null,
    `📦 *Tipo:* ${tipo}`, endereco ? `📍 *Endereço:* ${endereco}` : null,
    frete ? `🚚 *Frete:* ${frete}` : null, agendado ? `🕐 *Agendado:* ${agendado}` : null,
    ``, `🧾 *Itens:*`, itemLines, ``, `💰 *Total:* ${fmt(total)}`, `💳 *Pagamento:* ${pgto}`,
    obs ? `📝 *Obs:* ${obs}` : null,
    ``, `_Bot gratuito 2h — assine Pro para ilimitado._`,
  ].filter((l) => l !== null).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ok = (msg: string) => new Response(JSON.stringify({ ok: true, message: msg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: order } = await supabase.from("orders").select("id, organization_id, notes, created_at").eq("id", order_id).maybeSingle();
    if (!order) return ok("order not found");

    const { data: orderItems } = await supabase.from("order_items").select("name, quantity, price").eq("order_id", order_id);
    const { data: org } = await supabase.from("organizations").select("id, name, whatsapp").eq("id", order.organization_id).maybeSingle();
    if (!org) return ok("org not found");

    const { data: instance } = await supabase.from(FREE_TABLE)
      .select("instance_token, server_url, status, trial_expired")
      .eq("organization_id", org.id).in("status", ["connected", "open"]).maybeSingle();
    if (!instance) return ok("no connected free instance");
    if ((instance as any).trial_expired) return ok("free trial expired");

    const ownerPhone = (org as any).whatsapp?.replace(/\D/g, "");
    if (!ownerPhone || ownerPhone.length < 10) return ok("no valid owner phone");

    const { data: recent } = await supabase.from("whatsapp_notification_log" as any)
      .select("id").eq("order_id", order_id).eq("event", "new_order_owner").eq("status", "sent")
      .gte("created_at", new Date(Date.now() - 60_000).toISOString()).limit(1).maybeSingle();
    if (recent) return ok("duplicate");

    const phone = formatPhone(ownerPhone);
    const message = buildOwnerMessage(order, (orderItems ?? []) as any, (org as any).name ?? "Loja");
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

    await supabase.from("whatsapp_notification_log" as any).insert({ order_id, event: "new_order_owner", status: sendError ? "failed" : "sent", error: sendError ?? null });
    return ok(sendError ? `failed: ${sendError}` : `notified owner at ${phone}`);
  } catch (err) {
    console.error("[uazapi-free-notify-owner] err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});