import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";
const TRIAL_HOURS = 2;

function getFreeCfg() {
  const serverUrl = (Deno.env.get("UAZAPI_FREE_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
  const adminToken = Deno.env.get("UAZAPI_FREE_ADMIN_TOKEN") || null;
  return { serverUrl, adminToken };
}

function extractQr(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.qrcode, data.qrCode, data.qr, data.code, data.base64,
    data.instance?.qrcode, data.instance?.qrCode, data.instance?.qr, data.instance?.base64,
    data.data?.qrcode, data.data?.qrCode, data.data?.qr, data.data?.base64,
  ];
  for (const c of candidates) if (typeof c === "string" && c.length > 20) return c;
  return null;
}

async function tryConnect(serverUrl: string, instanceToken: string) {
  try {
    const res = await fetch(`${serverUrl}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({}),
    });
    const tokenInvalid = res.status === 401 || res.status === 403 || res.status === 404;
    if (!res.ok) return { qrcode: null, status: null, tokenInvalid };
    const data = await res.json();
    return { qrcode: extractQr(data), status: data?.instance?.status || data?.status || null, tokenInvalid: false };
  } catch { return { qrcode: null, status: null, tokenInvalid: false }; }
}

async function fetchQr(serverUrl: string, instanceToken: string) {
  let last = { qrcode: null as string | null, status: null as string | null, tokenInvalid: false };
  for (let i = 0; i < 4; i++) {
    last = await tryConnect(serverUrl, instanceToken);
    if (last.qrcode) return last;
    if (last.status === "connected" || last.status === "open") return last;
    if (last.tokenInvalid) return last;
    await new Promise((r) => setTimeout(r, 800));
  }
  return last;
}

async function configureWebhook(serverUrl: string, instanceToken: string, supabaseUrl: string): Promise<boolean> {
  const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-free-webhook`;
  try {
    const whRes = await fetch(`${serverUrl}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: instanceToken },
      body: JSON.stringify({
        enabled: true, url: webhookUrl, events: ["messages"],
        excludeMessages: ["fromMe", "wasSentByApi", "isGroups"],
        addUrlEvents: false, addUrlTypesMessages: false,
      }),
    });
    return whRes.ok;
  } catch { return false; }
}

async function createInstanceOnServer(serverUrl: string, adminToken: string, slug: string) {
  const instanceName = `free-org-${slug}-${Date.now().toString(36)}`;
  const paths = ["/instance/init", "/instance/create"];
  const attempts: Array<{ path: string; status: number; body: string }> = [];
  for (const path of paths) {
    const r = await fetch(`${serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: adminToken },
      body: JSON.stringify({ name: instanceName, systemName: "trendfood-free" }),
    });
    const text = await r.text();
    attempts.push({ path, status: r.status, body: text.slice(0, 300) });
    if (r.ok) {
      let data: any;
      try { data = JSON.parse(text); } catch { return { ok: false, attempts, error: "not_json" }; }
      const instanceToken = data?.instance?.token || data?.token;
      if (!instanceToken) return { ok: false, attempts, error: "no_token" };
      return { ok: true, instanceToken, instanceName, attempts };
    }
    if (r.status !== 404) break;
  }
  return { ok: false, attempts, error: "init_failed" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { serverUrl, adminToken } = getFreeCfg();
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "free_not_configured", message: "UAZAPI Free não configurado. Contate o suporte." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabaseAuth.auth.getClaims(token);
    const user = claims?.claims ? { id: claims.claims.sub as string } : null;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { organization_id } = await req.json();
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: org } = await supabase.from("organizations").select("id, user_id, slug").eq("id", organization_id).maybeSingle();
    if (!org) return new Response(JSON.stringify({ error: "org not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    const isAdmin = !!roleRow;
    if (org.user_id !== user.id && !isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Trial gate — mesmo admin não pode reativar sem resetar trial_expired
    const { data: existing } = await supabase.from(FREE_TABLE).select("*").eq("organization_id", organization_id).maybeSingle();
    if (existing?.trial_expired && !isAdmin) {
      return new Response(JSON.stringify({
        error: "free_trial_expired",
        message: "Seu trial gratuito de 2h já foi usado. Assine o plano Pro para ter WhatsApp ilimitado.",
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (existing?.instance_token) {
      const qr = await fetchQr(serverUrl, existing.instance_token);
      if (qr.qrcode || qr.status === "open" || qr.status === "connected") {
        await configureWebhook(serverUrl, existing.instance_token, supabaseUrl);
        return new Response(JSON.stringify({ ok: true, existed: true, instance: existing, qrcode: qr.qrcode, status: qr.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // token stale → recria
      const recreated = await createInstanceOnServer(serverUrl, adminToken, org.slug);
      if (!recreated.ok) return new Response(JSON.stringify({ error: recreated.error, attempts: recreated.attempts }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const webhookOk = await configureWebhook(serverUrl, recreated.instanceToken!, supabaseUrl);
      const qr2 = await fetchQr(serverUrl, recreated.instanceToken!);
      const { data: updated } = await supabase.from(FREE_TABLE).update({
        instance_name: recreated.instanceName, instance_token: recreated.instanceToken,
        status: qr2.status || "connecting", webhook_configured: webhookOk,
        phone_connected: null, connected_at: null, server_url: serverUrl,
      }).eq("id", existing.id).select().single();
      return new Response(JSON.stringify({ ok: true, existed: true, recreated: true, instance: updated ?? existing, qrcode: qr2.qrcode, status: qr2.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cria do zero
    const created = await createInstanceOnServer(serverUrl, adminToken, org.slug);
    if (!created.ok) {
      return new Response(JSON.stringify({ error: created.error, attempts: created.attempts }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const webhookOk = await configureWebhook(serverUrl, created.instanceToken!, supabaseUrl);
    const qr = await fetchQr(serverUrl, created.instanceToken!);

    const upsert = {
      organization_id,
      instance_name: created.instanceName,
      instance_token: created.instanceToken,
      status: qr.status || "connecting",
      webhook_configured: webhookOk,
      server_url: serverUrl,
      trial_expired: false,
    };
    let saved: any;
    if (existing) {
      const { data } = await supabase.from(FREE_TABLE).update(upsert).eq("id", existing.id).select().single();
      saved = data;
    } else {
      const { data, error: saveErr } = await supabase.from(FREE_TABLE).insert(upsert).select().single();
      if (saveErr) return new Response(JSON.stringify({ error: "db_save_failed", detail: saveErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      saved = data;
    }

    return new Response(JSON.stringify({ ok: true, existed: false, instance: saved, qrcode: qr.qrcode, status: qr.status, trial_hours: TRIAL_HOURS }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("uazapi-free-create-instance error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});