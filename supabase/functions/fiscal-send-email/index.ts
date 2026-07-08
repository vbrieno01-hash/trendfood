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
  console.warn("[fiscal-email] fail", { code, message, detail });
  return json({ ok: false, code, message, detail }, 200);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const invoice_id: string | undefined = body?.invoice_id;
    const emails: unknown = body?.emails;

    if (!invoice_id) return fail("invalid_payload", "invoice_id obrigatório");
    if (!Array.isArray(emails) || emails.length === 0) return fail("invalid_payload", "Informe pelo menos 1 e-mail");
    if (emails.length > 10) return fail("invalid_payload", "Máximo 10 e-mails por requisição");
    const cleanEmails = emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
    if (cleanEmails.some((e) => !EMAIL_RE.test(e))) return fail("invalid_payload", "E-mail inválido na lista");

    const { data: invoice } = await supabase.from("fiscal_invoices")
      .select("*").eq("id", invoice_id).maybeSingle();
    if (!invoice) return fail("invoice_not_found", "Nota não encontrada");

    const { data: org } = await supabase.from("organizations")
      .select("user_id").eq("id", invoice.organization_id).maybeSingle();
    if (!org || org.user_id !== userId) return fail("forbidden", "Sem permissão");

    if (invoice.status !== "authorized") return fail("not_authorized", "NFC-e precisa estar autorizada para envio por e-mail");

    const { data: cfg } = await supabase.from("fiscal_config")
      .select("environment, focus_token_mode").eq("organization_id", invoice.organization_id).maybeSingle();
    if (!cfg) return fail("missing_config", "Configuração fiscal não encontrada");

    const token = await getFocusToken(supabase, invoice.organization_id, cfg.focus_token_mode);
    if (!token) return fail("missing_token", "Token Focus NFe não configurado");

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const ref = invoice.plugnotas_id || `order_${invoice.order_id}`;
    const auth = "Basic " + btoa(`${token}:`);

    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}/email`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify({ emails: cleanEmails }),
      });
    } catch (netErr) {
      const isTimeout = (netErr as Error)?.name === "AbortError";
      return fail(isTimeout ? "timeout_sefaz" : "network_error", isTimeout ? "Timeout ao contatar Focus" : "Falha de rede");
    }
    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.mensagem || `Focus retornou ${res.status}`;
      return fail("focus_error", String(msg), { status: res.status, body: data });
    }

    // Append log to emails_sent
    const prev = Array.isArray(invoice.emails_sent) ? invoice.emails_sent : [];
    const entry = { sent_at: new Date().toISOString(), to: cleanEmails, by: userId };
    await supabase.from("fiscal_invoices").update({
      emails_sent: [...prev, entry].slice(-20), // mantém últimos 20 envios
    }).eq("id", invoice.id);

    return ok({ mensagem: data?.mensagem || "Emails agendados para envio", emails: cleanEmails });
  } catch (e) {
    console.error("[fiscal-email] fatal", { message: String((e as Error)?.message || e) });
    return fail("internal_error", String((e as Error)?.message || e));
  }
});