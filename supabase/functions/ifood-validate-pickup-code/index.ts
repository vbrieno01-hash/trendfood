import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

async function getValidToken(supabase: any, orgId: string): Promise<string | null> {
  const { data: cred } = await supabase
    .from("ifood_credentials").select("*")
    .eq("organization_id", orgId).maybeSingle();
  if (!cred) return null;
  if (cred.access_token && cred.token_expires_at && new Date(cred.token_expires_at) > new Date()) return cred.access_token;
  const clientId = Deno.env.get("IFOOD_CLIENT_ID");
  const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");
  if (!clientId || !clientSecret) return cred.access_token ?? null;
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
  const tr = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tr.ok) return cred.access_token ?? null;
  const td = await tr.json();
  const access = td.accessToken ?? td.access_token;
  await supabase.from("ifood_credentials").update({
    access_token: access,
    refresh_token: td.refreshToken ?? td.refresh_token ?? cred.refresh_token,
    token_expires_at: new Date(Date.now() + (td.expiresIn ?? td.expires_in ?? 3600) * 1000).toISOString(),
  }).eq("id", cred.id);
  return access;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const orgId = String(body?.organization_id || "");
    const ifoodOrderId = String(body?.ifood_order_id || "");
    const code = String(body?.code || "").trim();
    if (!orgId || !ifoodOrderId || !code) {
      return new Response(JSON.stringify({ error: "organization_id, ifood_order_id, code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = await getValidToken(supabase, orgId);
    if (!token) {
      return new Response(JSON.stringify({ error: "iFood not connected" }),
        { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const res = await fetch(`${IFOOD_API}/order/v1.0/orders/${ifoodOrderId}/validatePickupCode`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

    await supabase.from("ifood_event_log").insert({
      organization_id: orgId,
      ifood_order_id: ifoodOrderId,
      code: res.ok ? "OUT_PICKUP_CODE_VALID" : "OUT_PICKUP_CODE_INVALID",
      payload: { http: res.status, body: parsed, sent_code_len: code.length },
      source: "outbound",
    });

    return new Response(JSON.stringify({
      success: res.ok,
      http: res.status,
      valid: res.ok && (parsed?.valid !== false),
      response: parsed,
    }), { status: res.ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[ifood-validate-pickup-code]", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});