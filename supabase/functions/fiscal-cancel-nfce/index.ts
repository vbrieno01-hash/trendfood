import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function getFocusToken(supabase: any, orgId: string, mode: string | null | undefined): Promise<string | null> {
  if (mode === "own") {
    const { data } = await supabase.from("organization_secrets")
      .select("focus_nfe_token").eq("organization_id", orgId).maybeSingle();
    return data?.focus_nfe_token || null;
  }
  return Deno.env.get("FOCUS_NFE_TOKEN") || null;
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

    // Descobre modo do token pela config da loja
    const { data: cfg } = await supabase.from("fiscal_config")
      .select("focus_token_mode").eq("organization_id", inv.organization_id).maybeSingle();
    const token = await getFocusToken(supabase, inv.organization_id, cfg?.focus_token_mode);
    if (!token) return json({ error: "Focus NFe token não configurado" }, 500);

    const host = inv.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = "Basic " + btoa(`${token}:`);
    // Focus stores our ref (e.g. order_<uuid>) as plugnotas_id
    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(inv.plugnotas_id!)}`, {
        method: "DELETE",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa: motivo }),
      });
    } catch (netErr) {
      const msg = (netErr as Error)?.name === "AbortError" ? "timeout_sefaz" : "network_error";
      return json({ error: msg }, 504);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "focus_error", status: res.status, detail: data }, 400);

    await supabase.from("fiscal_invoices").update({
      status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: motivo,
    }).eq("id", invoice_id);
    await supabase.from("orders").update({ fiscal_status: "cancelled" }).eq("id", inv.order_id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});