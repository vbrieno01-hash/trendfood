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

/**
 * Responde a uma disputa da Plataforma de Negociação do iFood.
 * Body:
 *   - dispute_id (string, obrigatório)
 *   - organization_id (uuid, obrigatório)
 *   - action: "accept" | "reject" | "alternative"
 *   - reason?: string (motivo curto)
 *   - detail_reason?: string
 *   - alternative_amount?: number (em reais, p/ alternative)
 *   - additional_time_minutes?: number (p/ alternative)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const disputeId = String(body?.dispute_id || "").trim();
    const orgId = String(body?.organization_id || "").trim();
    const action: "accept" | "reject" | "alternative" = body?.action;
    if (!disputeId || !orgId || !["accept", "reject", "alternative"].includes(action)) {
      return new Response(JSON.stringify({ error: "dispute_id, organization_id and action (accept|reject|alternative) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: dispute } = await supabase.from("ifood_disputes")
      .select("*").eq("dispute_id", disputeId).maybeSingle();
    if (!dispute) {
      return new Response(JSON.stringify({ error: "dispute not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dispute.organization_id !== orgId) {
      return new Response(JSON.stringify({ error: "dispute does not belong to this organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dispute.status !== "open") {
      return new Response(JSON.stringify({ error: `dispute already ${dispute.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = await getValidToken(supabase, orgId);
    if (!token) {
      return new Response(JSON.stringify({ error: "iFood not connected" }),
        { status: 412, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const reason = String(body?.reason || "CUSTOMER_SATISFACTION").slice(0, 80);
    const detailReason = String(body?.detail_reason || "").slice(0, 500) || undefined;
    const altAmount = Number(body?.alternative_amount ?? 0);
    const addMinutes = Number(body?.additional_time_minutes ?? 0);

    const endpoint = `${IFOOD_API}/order/v1.0/disputes/${disputeId}/${action}`;
    let payload: any = { reason };
    if (detailReason) payload.detailReason = detailReason;
    if (action === "alternative") {
      payload = {
        ...payload,
        type: addMinutes > 0 ? "ADDITIONAL_TIME" : "REFUND",
        ...(addMinutes > 0 ? { additionalTime: addMinutes } : {}),
        ...(altAmount > 0 ? { amount: altAmount } : {}),
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }

    if (!res.ok) {
      await supabase.from("ifood_event_log").insert({
        organization_id: orgId,
        ifood_order_id: dispute.ifood_order_id,
        code: `OUT_HANDSHAKE_${action.toUpperCase()}_FAILED`,
        payload: { http: res.status, body: parsed, sent: payload },
        internal_order_id: dispute.order_id,
        source: "outbound",
      });
      return new Response(JSON.stringify({ error: `iFood ${res.status}`, body: parsed }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newStatus = action === "accept" ? "accepted"
      : action === "reject" ? "rejected"
      : "alternative_offered";

    await supabase.from("ifood_disputes").update({
      status: newStatus,
      responded_at: new Date().toISOString(),
      response_payload: { request: payload, response: parsed },
    }).eq("id", dispute.id);

    await supabase.from("ifood_event_log").insert({
      organization_id: orgId,
      ifood_order_id: dispute.ifood_order_id,
      code: `OUT_HANDSHAKE_${action.toUpperCase()}`,
      payload: { request: payload, response: parsed },
      internal_order_id: dispute.order_id,
      source: "outbound",
    });

    return new Response(JSON.stringify({ success: true, action, status: newStatus, response: parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[ifood-handshake-respond]", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});