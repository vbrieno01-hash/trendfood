import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";
const TRIAL_HOURS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    console.log("[wa-free-webhook] RAW:", JSON.stringify(body).slice(0, 4000));

    const rawMessage =
      body?.message?.content?.text || body?.message?.text || body?.text ||
      body?.data?.message?.conversation || body?.data?.message?.extendedTextMessage?.text || body?.data?.body || null;
    const message = typeof rawMessage === "string" ? rawMessage
      : (rawMessage && typeof rawMessage === "object" && typeof rawMessage.text === "string") ? rawMessage.text : null;

    const rawPhone = body?.chat?.phone || body?.message?.sender || body?.message?.chatid ||
      body?.sender || body?.chatid || body?.data?.key?.remoteJid || body?.data?.from || null;
    const phone = rawPhone
      ? String(rawPhone).replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "") : null;

    if (!message || !phone) {
      return new Response(JSON.stringify({ ok: true, skipped: "no message/phone" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isGroup = String(rawPhone || "").includes("@g.us") ||
      body?.chat?.wa_isGroup === true || body?.message?.isGroup === true || body?.isGroup === true;
    if (isGroup) return new Response(JSON.stringify({ ok: true, skipped: "group" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fromMe = body?.message?.fromMe === true || body?.message?.wasSentByApi === true ||
      body?.data?.key?.fromMe === true || body?.data?.fromMe === true || body?.fromMe === true;
    if (fromMe) return new Response(JSON.stringify({ ok: true, skipped: "fromMe" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Dedupe
    const messageIdDedup = body?.message?.messageid || body?.message?.id || body?.data?.key?.id || null;
    if (messageIdDedup) {
      const { error: dupErr } = await supabase.from("wa_message_dedupe").insert({
        message_id: `free:${messageIdDedup}`,
        instance_name: body?.instanceName || body?.instance?.name || null,
      });
      if (dupErr && (dupErr as any).code === "23505") {
        return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const instanceToken = body?.token || body?.instance?.token || body?.data?.token || null;
    const instanceName = body?.instance?.name || body?.instanceName || body?.data?.instance || null;
    const payloadBaseUrl = body?.BaseUrl || body?.baseUrl || body?.instance?.serverUrl || null;

    if (!instanceToken && !instanceName) {
      return new Response(JSON.stringify({ ok: true, skipped: "no instance id" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let q = supabase.from(FREE_TABLE).select("organization_id, instance_token, trial_expired, trial_started_at, trial_expires_at");
    if (instanceToken) q = q.eq("instance_token", instanceToken);
    else q = q.eq("instance_name", instanceName);
    const { data: inst } = await q.maybeSingle();
    if (!inst?.organization_id) {
      return new Response(JSON.stringify({ ok: true, skipped: "instance not free" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if ((inst as any).trial_expired) {
      return new Response(JSON.stringify({ ok: true, skipped: "trial expired" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Marca connected + inicia trial se ainda não iniciou
    const updates: Record<string, unknown> = {
      status: "connected", phone_connected: phone, connected_at: new Date().toISOString(),
    };
    if (payloadBaseUrl) updates.server_url = payloadBaseUrl;
    if (!(inst as any).trial_started_at) {
      const now = new Date();
      updates.trial_started_at = now.toISOString();
      updates.trial_expires_at = new Date(now.getTime() + TRIAL_HOURS * 3600 * 1000).toISOString();
    }
    await supabase.from(FREE_TABLE).update(updates).eq("organization_id", (inst as any).organization_id);

    // Delega para o handler IA existente (mesmo do bot pago) — mantém comportamento unificado
    const botRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-bot-respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        phone, message,
        organization_id: (inst as any).organization_id,
        instance_token: (inst as any).instance_token,
        server_url: payloadBaseUrl || Deno.env.get("UAZAPI_FREE_SERVER_URL") || "https://free.uazapi.com",
      }),
    });
    const botData = await botRes.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, routed_by: "free", ...botData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("whatsapp-free-webhook err:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});