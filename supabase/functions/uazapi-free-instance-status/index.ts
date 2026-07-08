import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FREE_TABLE = "whatsapp_free_instances";
const TRIAL_HOURS = 2;

function getFreeCfg() {
  const serverUrl = (Deno.env.get("UAZAPI_FREE_SERVER_URL") || "https://free.uazapi.com").replace(/\/$/, "");
  return { serverUrl };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { serverUrl } = getFreeCfg();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabaseAuth.auth.getClaims(token);
    const user = claims?.claims ? { id: claims.claims.sub as string } : null;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const organization_id = url.searchParams.get("organization_id");
    if (!organization_id) return new Response(JSON.stringify({ error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: org } = await supabase.from("organizations").select("user_id").eq("id", organization_id).maybeSingle();
    if (!org) return new Response(JSON.stringify({ error: "org not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (org.user_id !== user.id && !roleRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: inst } = await supabase.from(FREE_TABLE).select("*").eq("organization_id", organization_id).maybeSingle();
    if (!inst || !inst.instance_token) {
      return new Response(JSON.stringify({ ok: true, instance: inst ?? null, trial_hours: TRIAL_HOURS }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let liveStatus: string | null = null;
    let livePhone: string | null = null;
    let qrcode: string | null = null;
    let tokenInvalid = false;

    try {
      const sres = await fetch(`${serverUrl}/instance/status`, { method: "GET", headers: { token: inst.instance_token } });
      const stext = await sres.text();
      let sdata: any = null;
      try { sdata = JSON.parse(stext); } catch {}
      const rawStatus = sdata?.instance?.status || sdata?.status || null;
      if (sres.status === 401 || sres.status === 403 || sres.status === 404) tokenInvalid = true;
      if (sres.ok && sdata) {
        if (rawStatus === "open" || rawStatus === "connected") liveStatus = "connected";
        else if (rawStatus === "close" || rawStatus === "disconnected" || rawStatus === "logout") liveStatus = "disconnected";
        else if (rawStatus) liveStatus = rawStatus;
        livePhone = sdata?.instance?.owner || sdata?.instance?.phone || sdata?.phone || null;
        qrcode = extractQr(sdata);
      }
    } catch (e) { console.error("status err:", (e as Error).message); }

    if (!qrcode && liveStatus !== "connected") {
      try {
        const cres = await fetch(`${serverUrl}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: inst.instance_token },
          body: JSON.stringify({}),
        });
        const ctext = await cres.text();
        let cdata: any = null;
        try { cdata = JSON.parse(ctext); } catch {}
        const cStatus = cdata?.instance?.status || cdata?.status || null;
        qrcode = extractQr(cdata);
        if (cres.status === 401 || cres.status === 403 || cres.status === 404) tokenInvalid = true;
        if (!liveStatus && cStatus) {
          if (cStatus === "open" || cStatus === "connected") liveStatus = "connected";
          else if (cStatus === "close" || cStatus === "disconnected" || cStatus === "logout") liveStatus = "disconnected";
          else liveStatus = cStatus;
        }
      } catch (e) { console.error("connect fb err:", (e as Error).message); }
    }

    // Sincroniza + inicia trial na primeira conexão
    const updates: Record<string, unknown> = {};
    if (liveStatus && liveStatus !== inst.status) updates.status = liveStatus;
    if (livePhone && livePhone !== inst.phone_connected) updates.phone_connected = String(livePhone).replace(/\D/g, "");
    if (liveStatus === "connected" && !inst.connected_at) updates.connected_at = new Date().toISOString();
    if (liveStatus === "connected" && !inst.trial_started_at) {
      const now = new Date();
      updates.trial_started_at = now.toISOString();
      updates.trial_expires_at = new Date(now.getTime() + TRIAL_HOURS * 3600 * 1000).toISOString();
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from(FREE_TABLE).update(updates).eq("id", inst.id);
      Object.assign(inst, updates);
    }

    return new Response(JSON.stringify({
      ok: true, instance: inst, qrcode, liveStatus,
      tokenInvalid: tokenInvalid && !qrcode,
      needsRecreate: tokenInvalid && !qrcode,
      trial_hours: TRIAL_HOURS,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("uazapi-free-instance-status error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});