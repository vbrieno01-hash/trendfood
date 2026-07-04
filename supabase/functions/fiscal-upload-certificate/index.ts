import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  console.log("[fiscal-upload-certificate] Função iniciada", {
    method: req.method,
    url: req.url,
    has_auth: !!req.headers.get("Authorization"),
    content_type: req.headers.get("content-type") || null,
    ts: new Date().toISOString(),
  });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") {
      return json({ ok: false, code: "method_not_allowed", message: "Método não permitido" });
    }
    const ct = req.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return json({ ok: false, code: "invalid_content_type", message: "Content-Type deve ser multipart/form-data", detail: ct });
    }
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ ok: false, code: "unauthorized", message: "Não autorizado" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn("[fiscal-upload-certificate] auth.getUser falhou", { message: userErr?.message });
      return json({ ok: false, code: "unauthorized", message: "Sessão inválida" });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch (e) {
      console.error("[fiscal-upload-certificate] formData() falhou", { message: (e as Error).message });
      return json({ ok: false, code: "invalid_multipart", message: "Payload multipart inválido", detail: String((e as Error).message || e) });
    }
    const orgId = String(form.get("organization_id") || "");
    const password = String(form.get("password") || "");
    const file = form.get("file") as File | null;
    console.log("[fiscal-upload-certificate] form parseado", {
      has_org: !!orgId,
      has_password: !!password,
      has_file: !!file,
      file_name: file?.name || null,
      file_size: file?.size || 0,
    });
    if (!orgId || !password || !file) {
      return json({ ok: false, code: "missing_fields", message: "organization_id, password e file são obrigatórios" });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pfx", "p12"].includes(ext)) {
      return json({ ok: false, code: "invalid_extension", message: "Arquivo deve ser .pfx ou .p12", detail: ext });
    }
    if (file.size > 5 * 1024 * 1024) {
      return json({ ok: false, code: "file_too_large", message: "Certificado excede 5MB" });
    }

    const { data: cfg, error: cfgErr } = await supabase.from("fiscal_config").select("*").eq("organization_id", orgId).maybeSingle();
    if (cfgErr) {
      console.error("[fiscal-upload-certificate] erro lendo fiscal_config", { message: cfgErr.message });
      return json({ ok: false, code: "fiscal_config_error", message: "Erro ao ler configuração fiscal", detail: cfgErr.message });
    }
    if (!cfg) return json({ ok: false, code: "fiscal_config_missing", message: "Configuração fiscal não encontrada. Salve os dados fiscais antes." });

    const token = Deno.env.get("FOCUS_NFE_TOKEN");
    if (!token) {
      console.error("[fiscal-upload-certificate] FOCUS_NFE_TOKEN ausente");
      return json({ ok: false, code: "focus_token_missing", message: "FOCUS_NFE_TOKEN não configurado no backend" });
    }

    const cnpjClean = (cfg.cnpj || "").replace(/\D/g, "");
    if (!cnpjClean) return json({ ok: false, code: "cnpj_missing", message: "CNPJ ausente em fiscal_config" });

    // Focus NFe accepts base64 upload: PUT /v2/empresas/{cnpj} with arquivo_certificado_base64 + senha_certificado
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = "Basic " + btoa(`${token}:`);
    console.log("[fiscal-upload-certificate] chamando Focus NFe", { host, cnpj: cnpjClean, env: cfg.environment });
    const res = await fetch(`${host}/v2/empresas/${cnpjClean}`, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        arquivo_certificado_base64: b64,
        senha_certificado: password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    console.log("[fiscal-upload-certificate] Focus respondeu", { status: res.status, ok: res.ok });
    if (!res.ok) {
      return json({ ok: false, code: "focus_error", message: "Focus NFe rejeitou o certificado", status: res.status, detail: data });
    }

    const vencimento = data?.certificado_valido_ate || data?.certificado_valido_de || null;
    await supabase.from("fiscal_config").update({
      certificado_uploaded_at: new Date().toISOString(),
      certificado_expira_em: vencimento ? String(vencimento).slice(0, 10) : null,
    }).eq("id", cfg.id);

    return json({ ok: true, expira_em: vencimento });
  } catch (e) {
    console.error("[fiscal-upload-certificate] Exceção inesperada", { message: (e as Error).message, stack: (e as Error).stack });
    return json({ ok: false, code: "internal_error", message: String((e as Error).message || e) }, 500);
  }
});