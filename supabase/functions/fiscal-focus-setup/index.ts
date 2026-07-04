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
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const { organization_id } = await req.json();
    if (!organization_id) return json({ error: "organization_id required" }, 400);

    const { data: cfg, error } = await supabase.from("fiscal_config")
      .select("*").eq("organization_id", organization_id).maybeSingle();
    if (error) return json({ error: error.message }, 400);
    if (!cfg) return json({ error: "fiscal_config not found — create it first" }, 404);

    const token = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!token) return json({ error: "FOCUS_NFE_TOKEN not configured" }, 500);

    const end = (cfg.endereco_json || {}) as Record<string, string>;
    const cnpj = (cfg.cnpj || "").replace(/\D/g, "");
    const payload = {
      cnpj,
      nome: cfg.razao_social,
      nome_fantasia: cfg.nome_fantasia,
      inscricao_estadual: cfg.ie || "ISENTO",
      inscricao_municipal: cfg.im || undefined,
      regime_tributario: cfg.regime_tributario ?? 1,
      logradouro: end.logradouro,
      numero: end.numero,
      bairro: end.bairro,
      cep: (end.cep || "").replace(/\D/g, ""),
      municipio: end.cidade,
      uf: end.uf,
      email: end.email || undefined,
      telefone: end.telefone || undefined,
      habilita_nfce: true,
      csc_producao: cfg.environment === "producao" ? cfg.csc_token : undefined,
      csc_id_producao: cfg.environment === "producao" ? cfg.csc_id : undefined,
      csc_homologacao: cfg.environment !== "producao" ? cfg.csc_token : undefined,
      csc_id_homologacao: cfg.environment !== "producao" ? cfg.csc_id : undefined,
    };

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = "Basic " + btoa(`${token}:`);

    // Try PUT (update) first; if 404, POST
    let res = await fetch(`${host}/v2/empresas/${cnpj}`, {
      method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 404) {
      res = await fetch(`${host}/v2/empresas`, {
        method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "focus_error", status: res.status, detail: data }, 400);

    await supabase.from("fiscal_config").update({ plugnotas_empresa_id: cnpj }).eq("id", cfg.id);
    return json({ ok: true, cnpj, upstream: data });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});