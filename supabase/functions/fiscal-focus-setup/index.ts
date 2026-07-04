import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  console.log("[fiscal-focus-setup] Função iniciada", {
    method: req.method,
    has_auth: !!req.headers.get("Authorization"),
    ts: new Date().toISOString(),
  });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, code: "unauthorized", message: "Não autorizado" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ ok: false, code: "unauthorized", message: "Sessão inválida" });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const { organization_id } = body;
    if (!organization_id) return json({ ok: false, code: "missing_organization_id", message: "organization_id é obrigatório" });

    const { data: cfg, error } = await supabase.from("fiscal_config")
      .select("*").eq("organization_id", organization_id).maybeSingle();
    if (error) return json({ ok: false, code: "fiscal_config_error", message: "Erro ao ler configuração fiscal", detail: error.message });
    if (!cfg) return json({ ok: false, code: "fiscal_config_missing", message: "Salve os dados fiscais antes de sincronizar" });

    const token = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!token) {
      console.error("[fiscal-focus-setup] FOCUS_NFE_TOKEN ausente");
      return json({ ok: false, code: "focus_token_missing", message: "FOCUS_NFE_TOKEN não configurado no backend" });
    }

    const end = (cfg.endereco_json || {}) as Record<string, string>;
    const cnpj = (cfg.cnpj || "").replace(/\D/g, "");
    if (!cnpj) return json({ ok: false, code: "cnpj_missing", message: "CNPJ ausente em fiscal_config" });
    const missing: string[] = [];
    if (!cfg.razao_social) missing.push("razao_social");
    if (!end.logradouro) missing.push("logradouro");
    if (!end.numero) missing.push("numero");
    if (!end.bairro) missing.push("bairro");
    if (!end.cidade) missing.push("cidade");
    if (!end.uf) missing.push("uf");
    if (!end.cep) missing.push("cep");
    if (missing.length) {
      return json({ ok: false, code: "incomplete_fiscal_config", message: `Campos obrigatórios ausentes: ${missing.join(", ")}`, detail: { missing } });
    }
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

    console.log("[fiscal-focus-setup] chamando Focus NFe", { host, cnpj, env: cfg.environment });
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
    console.log("[fiscal-focus-setup] Focus respondeu", { status: res.status, ok: res.ok });
    if (!res.ok) {
      return json({ ok: false, code: "focus_error", message: "Focus NFe rejeitou os dados da empresa", status: res.status, detail: data });
    }

    await supabase.from("fiscal_config").update({ plugnotas_empresa_id: cnpj }).eq("id", cfg.id);
    return json({ ok: true, cnpj, upstream: data });
  } catch (e) {
    console.error("[fiscal-focus-setup] Exceção inesperada", { message: (e as Error).message, stack: (e as Error).stack });
    return json({ ok: false, code: "internal_error", message: String((e as Error).message || e) }, 500);
  }
});