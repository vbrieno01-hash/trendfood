import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PLUGNOTAS_BASE = "https://api.plugnotas.com.br";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const body = await req.json();
    const { organization_id } = body || {};
    if (!organization_id) return json({ error: "organization_id required" }, 400);

    // Ownership check via RLS-enabled select
    const { data: cfg, error: cfgErr } = await supabase
      .from("fiscal_config").select("*").eq("organization_id", organization_id).maybeSingle();
    if (cfgErr) return json({ error: cfgErr.message }, 400);
    if (!cfg) return json({ error: "fiscal_config not found — create it first" }, 404);

    const apiKey = Deno.env.get("PLUGNOTAS_API_KEY");
    if (!apiKey) return json({ error: "PLUGNOTAS_API_KEY not configured" }, 500);

    // Build PlugNotas company payload
    const end = (cfg.endereco_json || {}) as Record<string, string>;
    const payload = {
      cpfCnpj: cfg.cnpj?.replace(/\D/g, ""),
      inscricaoEstadual: cfg.ie || "ISENTO",
      inscricaoMunicipal: cfg.im || undefined,
      razaoSocial: cfg.razao_social,
      nomeFantasia: cfg.nome_fantasia,
      regimeTributario: cfg.regime_tributario ?? 1,
      endereco: {
        logradouro: end.logradouro,
        numero: end.numero,
        bairro: end.bairro,
        codigoCidade: end.cod_municipio,
        descricaoCidade: end.cidade,
        estado: end.uf,
        cep: (end.cep || "").replace(/\D/g, ""),
      },
      email: end.email || undefined,
      telefone: end.telefone || undefined,
      nfce: {
        ativo: true,
        producao: cfg.environment === "producao",
        sefaz: { idCodigoSegurancaContribuinte: cfg.csc_id, codigoSegurancaContribuinte: cfg.csc_token },
      },
    };

    // Try update first, fall back to create
    const method = cfg.plugnotas_empresa_id ? "PATCH" : "POST";
    const path = cfg.plugnotas_empresa_id ? `/empresa/${payload.cpfCnpj}` : `/empresa`;
    const res = await fetch(`${PLUGNOTAS_BASE}${path}`, {
      method,
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: "plugnotas_error", status: res.status, detail: data }, 400);

    const empresaId = data?.data?.id || data?.id || payload.cpfCnpj;
    await supabase.from("fiscal_config").update({ plugnotas_empresa_id: empresaId }).eq("id", cfg.id);

    return json({ ok: true, plugnotas_empresa_id: empresaId });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});