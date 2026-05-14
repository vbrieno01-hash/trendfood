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
  if (!cred.token_expires_at || new Date(cred.token_expires_at) > new Date()) return cred.access_token;

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
    const url = new URL(req.url);
    const ifoodOrderId = url.searchParams.get("ifood_order_id");
    const orgId = url.searchParams.get("organization_id");
    if (!ifoodOrderId || !orgId) {
      return new Response(JSON.stringify({ error: "missing ifood_order_id or organization_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = await getValidToken(supabase, orgId);
    if (!token) {
      return new Response(JSON.stringify({ error: "no_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${IFOOD_API}/order/v1.0/orders/${ifoodOrderId}/cancellationReasons`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[ifood-cancellation-reasons] failed:", res.status, text.slice(0, 200));
      // Fallback: motivos comuns iFood (códigos genéricos)
      return new Response(JSON.stringify({
        reasons: [
          { cancelCodeId: "501", description: "Pedido em duplicidade" },
          { cancelCodeId: "502", description: "Item indisponível" },
          { cancelCodeId: "503", description: "Restaurante sem entregador" },
          { cancelCodeId: "504", description: "Cardápio desatualizado" },
          { cancelCodeId: "505", description: "Pedido fora da área de entrega" },
          { cancelCodeId: "506", description: "Cliente solicitou cancelamento" },
          { cancelCodeId: "507", description: "Estabelecimento fechado" },
        ],
        fallback: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const reasons = JSON.parse(text);
    return new Response(JSON.stringify({ reasons }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ifood-cancellation-reasons] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
