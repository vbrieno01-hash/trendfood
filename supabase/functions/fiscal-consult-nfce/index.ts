import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fiscal-token",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function ok(data: Record<string, unknown> = {}) { return json({ ok: true, ...data }, 200); }
function fail(code: string, message: string, detail?: unknown) {
  console.warn("[fiscal-consult] fail", { code, message, detail });
  return json({ ok: false, code, message, detail }, 200);
}
function log(step: string, extra: Record<string, unknown> = {}) {
  console.log(`[fiscal-consult] ${step}`, extra);
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms = 12000): Promise<Response> {
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
    // Auth: JWT do dono OU token interno (para cron/auto-trigger)
    const internal = Deno.env.get("FISCAL_INTERNAL_TOKEN");
    const gotToken = req.headers.get("x-fiscal-token");
    const authHeader = req.headers.get("Authorization");
    const viaInternal = !!(internal && gotToken && gotToken === internal);

    let userId: string | null = null;
    if (!viaInternal) {
      if (!authHeader?.startsWith("Bearer ")) return fail("unauthorized", "Não autenticado");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: u } = await anonClient.auth.getUser();
      if (!u?.user) return fail("unauthorized", "Sessão inválida");
      userId = u.user.id;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const invoice_id: string | undefined = body?.invoice_id;
    const order_id: string | undefined = body?.order_id;
    if (!invoice_id && !order_id) return fail("invalid_payload", "invoice_id ou order_id obrigatório");

    let query = supabase.from("fiscal_invoices").select("*");
    query = invoice_id ? query.eq("id", invoice_id) : query.eq("order_id", order_id);
    const { data: invoice } = await query.maybeSingle();
    if (!invoice) return fail("invoice_not_found", "Nota não encontrada");

    if (userId) {
      const { data: org } = await supabase.from("organizations")
        .select("user_id").eq("id", invoice.organization_id).maybeSingle();
      if (!org || org.user_id !== userId) return fail("forbidden", "Sem permissão para consultar esta nota");
    }

    const { data: cfg } = await supabase.from("fiscal_config")
      .select("environment, focus_token_mode").eq("organization_id", invoice.organization_id).maybeSingle();
    if (!cfg) return fail("missing_config", "Configuração fiscal não encontrada");

    const token = await getFocusToken(supabase, invoice.organization_id, cfg.focus_token_mode);
    if (!token) return fail("missing_token", "Token Focus NFe não configurado");

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const ref = invoice.plugnotas_id || `order_${invoice.order_id}`;
    const auth = "Basic " + btoa(`${token}:`);
    log("focus_get", { host, ref, invoice_id: invoice.id });

    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}`, {
        method: "GET",
        headers: { "Authorization": auth },
      });
    } catch (netErr) {
      const isTimeout = (netErr as Error)?.name === "AbortError";
      return fail(isTimeout ? "timeout_sefaz" : "network_error", isTimeout ? "Timeout ao consultar SEFAZ" : "Falha de rede ao consultar Focus");
    }
    const data: any = await res.json().catch(() => ({}));
    log("focus_response", { status: res.status, body_keys: Object.keys(data || {}) });

    if (res.status === 404) {
      return fail("nfce_not_found_on_focus", "Nota não encontrada na Focus NFe (referência inexistente)");
    }
    if (!res.ok) {
      const msg = data?.mensagem || data?.mensagem_sefaz || `Focus retornou ${res.status}`;
      return fail("focus_error", String(msg), { status: res.status, body: data });
    }

    // Map response — same shape as emit sync
    const focusStatus = String(data?.status || "").toLowerCase();
    const chave = data?.chave_nfe || invoice.chave_acesso;
    const numero = data?.numero ?? invoice.numero;
    const serie = data?.serie ?? invoice.serie;
    const caminhoXml = data?.caminho_xml_nota_fiscal;
    const caminhoDanfe = data?.caminho_danfe;
    const caminhoXmlCancel = data?.caminho_xml_cancelamento;
    const qrcodeUrl = data?.qrcode_url;
    const mensagemSefaz = data?.mensagem_sefaz;
    const fullXml = caminhoXml ? (caminhoXml.startsWith("http") ? caminhoXml : `${host}${caminhoXml}`) : invoice.xml_url;
    const fullDanfe = caminhoDanfe ? (caminhoDanfe.startsWith("http") ? caminhoDanfe : `${host}${caminhoDanfe}`) : invoice.danfe_url;

    let newStatus = invoice.status;
    const patch: any = {};

    if (focusStatus === "autorizado" && invoice.status !== "authorized") {
      newStatus = "authorized";
      patch.status = "authorized";
      patch.chave_acesso = chave;
      patch.numero = numero;
      patch.serie = serie;
      patch.xml_url = fullXml;
      patch.danfe_url = fullDanfe;
      patch.qrcode_url = qrcodeUrl;
      if (!invoice.emitted_at) patch.emitted_at = new Date().toISOString();
      patch.rejection_reason = null;
    } else if (focusStatus === "cancelado" && invoice.status !== "cancelled") {
      newStatus = "cancelled";
      patch.status = "cancelled";
      if (!invoice.cancelled_at) patch.cancelled_at = new Date().toISOString();
      if (caminhoXmlCancel) patch.xml_url = caminhoXmlCancel.startsWith("http") ? caminhoXmlCancel : `${host}${caminhoXmlCancel}`;
    } else if (focusStatus === "erro_autorizacao" && invoice.status !== "rejected") {
      newStatus = "rejected";
      patch.status = "rejected";
      patch.rejection_reason = String(mensagemSefaz || data?.mensagem || "Erro de autorização").slice(0, 500);
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from("fiscal_invoices").update(patch).eq("id", invoice.id);
      await supabase.from("orders").update({ fiscal_status: newStatus, fiscal_invoice_id: invoice.id }).eq("id", invoice.order_id);
      // Se virou authorized agora, contabilizar cota (upsert idempotente)
      if (newStatus === "authorized") {
        await supabase.from("fiscal_usage_log").upsert({
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          environment: cfg.environment,
        }, { onConflict: "invoice_id" });
      }
      log("reconciled", { invoice_id: invoice.id, new_status: newStatus });
    } else {
      log("no_change", { invoice_id: invoice.id, focus_status: focusStatus, local_status: invoice.status });
    }

    return ok({ status: newStatus, focus_status: focusStatus, upstream: data });
  } catch (e) {
    console.error("[fiscal-consult] fatal", { message: String((e as Error)?.message || e), stack: (e as Error)?.stack });
    return fail("internal_error", String((e as Error)?.message || e));
  }
});