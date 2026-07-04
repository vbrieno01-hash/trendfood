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
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const form = await req.formData();
    const orgId = String(form.get("organization_id") || "");
    const password = String(form.get("password") || "");
    const file = form.get("file") as File | null;
    if (!orgId || !password || !file) return json({ error: "organization_id, password and file required" }, 400);
    if (file.size > 5 * 1024 * 1024) return json({ error: "certificate too large" }, 400);

    const { data: cfg } = await supabase.from("fiscal_config").select("*").eq("organization_id", orgId).maybeSingle();
    if (!cfg) return json({ error: "fiscal_config not found" }, 404);

    const apiKey = Deno.env.get("PLUGNOTAS_API_KEY");
    if (!apiKey) return json({ error: "PLUGNOTAS_API_KEY not configured" }, 500);

    // Forward multipart to PlugNotas
    const fd = new FormData();
    fd.append("arquivo", file, file.name || "certificado.pfx");
    fd.append("senha", password);
    const cnpjClean = (cfg.cnpj || "").replace(/\D/g, "");
    const res = await fetch(`${PLUGNOTAS_BASE}/certificado`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "plugnotas_error", status: res.status, detail: data }, 400);

    // Link certificate to company
    if (cfg.plugnotas_empresa_id) {
      await fetch(`${PLUGNOTAS_BASE}/empresa/${cnpjClean}/certificado`, {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ certificado: data?.id || data?.data?.id }),
      });
    }

    const vencimento = data?.vencimento || data?.data?.vencimento || null;
    await supabase.from("fiscal_config").update({
      certificado_uploaded_at: new Date().toISOString(),
      certificado_expira_em: vencimento ? String(vencimento).slice(0, 10) : null,
    }).eq("id", cfg.id);

    return json({ ok: true, expira_em: vencimento });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});