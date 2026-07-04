const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Público: apenas encaminha para fiscal-emit-nfce assinando com token interno.
    // Não faz nada custoso — só um POST. fiscal-emit-nfce faz rate-limit e idempotência.
    const internal = Deno.env.get("FISCAL_INTERNAL_TOKEN");
    if (!internal) return json({ error: "server misconfigured" }, 503);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "order_id required" }, 400);
    if (typeof order_id !== "string" || order_id.length > 64) return json({ error: "invalid order_id" }, 400);

    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/fiscal-emit-nfce`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        "x-fiscal-token": internal,
      },
      body: JSON.stringify({ order_id }),
    });
    const data = await res.json().catch(() => ({}));
    return json({ forwarded: true, upstream_status: res.status, data });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});