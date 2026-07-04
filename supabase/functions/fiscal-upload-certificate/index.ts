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

    const token = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!token) return json({ error: "FOCUS_NFE_TOKEN not configured" }, 500);

    const cnpjClean = (cfg.cnpj || "").replace(/\D/g, "");
    if (!cnpjClean) return json({ error: "CNPJ ausente em fiscal_config" }, 400);

    // Focus NFe accepts base64 upload: PUT /v2/empresas/{cnpj} with arquivo_certificado_base64 + senha_certificado
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = "Basic " + btoa(`${token}:`);
    const res = await fetch(`${host}/v2/empresas/${cnpjClean}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        arquivo_certificado_base64: b64,
        senha_certificado: password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "focus_error", status: res.status, detail: data }, 400);

    const vencimento = data?.certificado_valido_ate || data?.certificado_valido_de || null;
    await supabase.from("fiscal_config").update({
      certificado_uploaded_at: new Date().toISOString(),
      certificado_expira_em: vencimento ? String(vencimento).slice(0, 10) : null,
    }).eq("id", cfg.id);

    return json({ ok: true, expira_em: vencimento });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});