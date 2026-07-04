import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Gate de quota antes de despachar — se bloqueado, registra e não chama Focus.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order } = await supabase.from("orders")
      .select("id, organization_id").eq("id", order_id).maybeSingle();
    if (!order) return json({ error: "order not found" }, 404);

    const { data: quota } = await supabase.rpc("fiscal_check_quota", { _org_id: order.organization_id });
    if (quota?.blocked && !quota?.overage_allowed) {
      const { data: existing } = await supabase.from("fiscal_invoices")
        .select("id").eq("order_id", order_id).maybeSingle();
      const { data: cfg } = await supabase.from("fiscal_config")
        .select("environment").eq("organization_id", order.organization_id).maybeSingle();
      const patch = {
        organization_id: order.organization_id,
        order_id,
        status: "blocked_quota",
        environment: cfg?.environment || "homologacao",
        rejection_reason: String(quota?.reason || "Cota mensal esgotada").slice(0, 500),
      };
      if (existing?.id) {
        await supabase.from("fiscal_invoices").update(patch).eq("id", existing.id);
      } else {
        await supabase.from("fiscal_invoices").insert(patch);
      }
      return json({ blocked: true, quota });
    }

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