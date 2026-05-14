import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API = "https://merchant-api.ifood.com.br";

// Mapeia status interno → endpoint iFood
function endpointForStatus(newStatus: string, oldStatus: string | null): { path: string; body?: any } | null {
  switch (newStatus) {
    case "preparing":
      // Quando aceita: confirma + inicia preparo
      return { path: "startPreparation" };
    case "ready":
      // Pronto para retirada/entrega
      return { path: "readyToPickup" };
    case "delivered":
      return { path: "dispatch" };
    case "cancelled":
      return {
        path: "requestCancellation",
        body: { reason: "Cancelado pelo lojista", cancellationCode: "501" },
      };
    case "pending":
      // Reabre? Não dispara nada
      return null;
    default:
      return null;
  }
}

async function getValidToken(supabase: any, orgId: string): Promise<string | null> {
  const { data: cred } = await supabase
    .from("ifood_credentials").select("*")
    .eq("organization_id", orgId).single();
  if (!cred) return null;

  if (!cred.token_expires_at || new Date(cred.token_expires_at) > new Date()) {
    return cred.access_token;
  }

  // Refresh
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
  const tr = await fetch(`${IFOOD_API}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tr.ok) return null;
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
    const { ifood_order_id, organization_id, new_status, old_status } = body;
    if (!ifood_order_id || !organization_id || !new_status) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ep = endpointForStatus(new_status, old_status ?? null);
    if (!ep) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_mapping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getValidToken(supabase, organization_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "no_token" }), { status: 401, headers: corsHeaders });
    }

    const url = `${IFOOD_API}/order/v1.0/orders/${ifood_order_id}/${ep.path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });

    const text = await res.text();
    console.log(`[ifood-update-status] ${ep.path} → ${res.status}: ${text.slice(0, 200)}`);

    await supabase.from("ifood_event_log").insert({
      organization_id,
      ifood_order_id,
      code: `OUT_${ep.path.toUpperCase()}`,
      payload: { request: body, response_status: res.status, response: text.slice(0, 1000) },
      source: "outbound",
    });

    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.ok ? 200 : 502,
    });
  } catch (err: any) {
    console.error("[ifood-update-status] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
