import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function ok(data: Record<string, unknown> = {}) { return json({ ok: true, ...data }, 200); }
function fail(code: string, message: string, detail?: unknown) {
  console.warn("[fiscal-inutilize] fail", { code, message, detail });
  return json({ ok: false, code, message, detail }, 200);
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
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
    if (!authHeader?.startsWith("Bearer ")) return fail("unauthorized", "Não autenticado");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: u } = await anonClient.auth.getUser();
    if (!u?.user) return fail("unauthorized", "Sessão inválida");
    const userId = u.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { organization_id, serie, numero_inicial, numero_final, justificativa } = body || {};

    if (!organization_id || typeof organization_id !== "string") return fail("invalid_payload", "organization_id obrigatório");
    const serieN = Number(serie);
    const iniN = Number(numero_inicial);
    const finN = Number(numero_final);
    if (!Number.isInteger(serieN) || serieN < 1) return fail("invalid_payload", "serie inválida");
    if (!Number.isInteger(iniN) || iniN < 1) return fail("invalid_payload", "numero_inicial inválido");
    if (!Number.isInteger(finN) || finN < iniN) return fail("invalid_payload", "numero_final deve ser >= numero_inicial");
    if (finN - iniN > 1000) return fail("invalid_payload", "Faixa muito grande (máx 1000 números)");
    if (typeof justificativa !== "string" || justificativa.trim().length < 15) {
      return fail("invalid_payload", "Justificativa mínima de 15 caracteres exigida pela SEFAZ");
    }
    if (justificativa.length > 255) return fail("invalid_payload", "Justificativa até 255 caracteres");

    const { data: org } = await supabase.from("organizations")
      .select("user_id").eq("id", organization_id).maybeSingle();
    if (!org || org.user_id !== userId) return fail("forbidden", "Sem permissão");

    const { data: cfg } = await supabase.from("fiscal_config")
      .select("environment, focus_token_mode, cnpj").eq("organization_id", organization_id).maybeSingle();
    if (!cfg?.cnpj) return fail("missing_cnpj", "CNPJ da empresa não configurado");

    const token = await getFocusToken(supabase, organization_id, cfg.focus_token_mode);
    if (!token) return fail("missing_token", "Token Focus NFe não configurado");

    const cnpjClean = String(cfg.cnpj).replace(/\D/g, "");
    if (cnpjClean.length !== 14) return fail("invalid_payload", "CNPJ do emitente inválido");

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const auth = "Basic " + btoa(`${token}:`);

    // Cria registro local antes do request p/ auditoria
    const { data: ins } = await supabase.from("fiscal_inutilizations").insert({
      organization_id,
      serie: serieN,
      numero_inicial: iniN,
      numero_final: finN,
      justificativa: justificativa.trim(),
      environment: cfg.environment,
      status: "processing",
    }).select("id").single();
    const localId = ins?.id;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce/inutilizacao`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: cnpjClean,
          serie: serieN,
          numero_inicial: iniN,
          numero_final: finN,
          justificativa: justificativa.trim(),
        }),
      });
    } catch (netErr) {
      const isTimeout = (netErr as Error)?.name === "AbortError";
      const errCode = isTimeout ? "timeout_sefaz" : "network_error";
      if (localId) await supabase.from("fiscal_inutilizations").update({
        status: "rejected", mensagem_sefaz: errCode,
      }).eq("id", localId);
      return fail(errCode, isTimeout ? "Timeout ao contatar SEFAZ" : "Falha de rede");
    }
    const data: any = await res.json().catch(() => ({}));
    console.log("[fiscal-inutilize] focus_response", { status: res.status, body: data });

    if (!res.ok) {
      const msg = data?.mensagem || data?.mensagem_sefaz || `Focus retornou ${res.status}`;
      if (localId) await supabase.from("fiscal_inutilizations").update({
        status: "rejected", mensagem_sefaz: String(msg).slice(0, 500), response_json: data,
      }).eq("id", localId);
      return fail("focus_error", String(msg), { status: res.status, body: data });
    }

    const focusStatus = String(data?.status || "").toLowerCase();
    const newStatus = focusStatus === "autorizado" ? "authorized" : (focusStatus || "processing");
    const caminhoXml = data?.caminho_xml;
    const fullXml = caminhoXml ? (caminhoXml.startsWith("http") ? caminhoXml : `${host}${caminhoXml}`) : null;

    if (localId) await supabase.from("fiscal_inutilizations").update({
      status: newStatus,
      protocolo: data?.numero_protocolo || data?.protocolo || null,
      mensagem_sefaz: data?.mensagem_sefaz || data?.mensagem || null,
      xml_url: fullXml,
      response_json: data,
    }).eq("id", localId);

    return ok({ id: localId, status: newStatus, upstream: data });
  } catch (e) {
    console.error("[fiscal-inutilize] fatal", { message: String((e as Error)?.message || e) });
    return fail("internal_error", String((e as Error)?.message || e));
  }
});