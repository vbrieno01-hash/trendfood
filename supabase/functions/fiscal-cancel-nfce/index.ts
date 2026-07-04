import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PLUGNOTAS_BASE = "https://api.plugnotas.com.br";
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { invoice_id, motivo } = await req.json();
    if (!invoice_id || !motivo || motivo.length < 15) return json({ error: "motivo mínimo 15 caracteres" }, 400);

    const { data: inv } = await supabase.from("fiscal_invoices").select("*").eq("id", invoice_id).maybeSingle();
    if (!inv) return json({ error: "invoice not found" }, 404);
    if (inv.status !== "authorized") return json({ error: "only authorized invoices can be cancelled" }, 400);
    if (!inv.emitted_at) return json({ error: "missing emitted_at" }, 400);
    if (Date.now() - new Date(inv.emitted_at).getTime() > 30 * 60 * 1000)
      return json({ error: "prazo de cancelamento (30min) expirado" }, 400);

    const apiKey = Deno.env.get("PLUGNOTAS_API_KEY");
    if (!apiKey) return json({ error: "PLUGNOTAS_API_KEY not configured" }, 500);

    const res = await fetch(`${PLUGNOTAS_BASE}/nfce/${inv.plugnotas_id}/cancelamento`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ justificativa: motivo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "plugnotas_error", status: res.status, detail: data }, 400);

    await supabase.from("fiscal_invoices").update({
      status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: motivo,
    }).eq("id", invoice_id);
    await supabase.from("orders").update({ fiscal_status: "cancelled" }).eq("id", inv.order_id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});