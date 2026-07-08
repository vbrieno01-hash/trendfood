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
  console.warn("[fiscal-econf] fail", { code, message, detail });
  return json({ ok: false, code, message, detail }, 200);
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
    const action: string = String(body?.action || "");
    const invoice_id: string | undefined = body?.invoice_id;

    if (!["register", "consult", "cancel"].includes(action)) return fail("invalid_payload", "action deve ser register|consult|cancel");
    if (!invoice_id) return fail("invalid_payload", "invoice_id obrigatório");

    const { data: invoice } = await supabase.from("fiscal_invoices")
      .select("*").eq("id", invoice_id).maybeSingle();
    if (!invoice) return fail("invoice_not_found", "Nota não encontrada");

    const { data: org } = await supabase.from("organizations")
      .select("user_id").eq("id", invoice.organization_id).maybeSingle();
    if (!org || org.user_id !== userId) return fail("forbidden", "Sem permissão");

    if (invoice.status !== "authorized") return fail("not_authorized", "ECONF exige nota autorizada");

    const { data: cfg } = await supabase.from("fiscal_config")
      .select("environment, focus_token_mode").eq("organization_id", invoice.organization_id).maybeSingle();
    if (!cfg) return fail("missing_config", "Configuração fiscal não encontrada");

    const token = await getFocusToken(supabase, invoice.organization_id, cfg.focus_token_mode);
    if (!token) return fail("missing_token", "Token Focus NFe não configurado");

    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const ref = invoice.plugnotas_id || `order_${invoice.order_id}`;
    const auth = "Basic " + btoa(`${token}:`);

    // ─────────────────────────── REGISTER ───────────────────────────
    if (action === "register") {
      const { data_pagamento, valor_pago, forma_pagamento, tipo_integracao, cnpj_credenciadora, numero_autorizacao, bandeira_operadora } = body || {};
      if (!data_pagamento || !valor_pago || !forma_pagamento) {
        return fail("invalid_payload", "data_pagamento, valor_pago, forma_pagamento obrigatórios");
      }
      const payload: any = {
        data_pagamento,
        valor_pago: Number(valor_pago),
        forma_pagamento: String(forma_pagamento),
      };
      if (tipo_integracao) payload.tipo_integracao = String(tipo_integracao);
      if (cnpj_credenciadora) payload.cnpj_credenciadora = String(cnpj_credenciadora).replace(/\D/g, "");
      if (numero_autorizacao) payload.numero_autorizacao = String(numero_autorizacao);
      if (bandeira_operadora) payload.bandeira_operadora = String(bandeira_operadora);

      const { data: ins } = await supabase.from("fiscal_econf_events").insert({
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        status: "processing",
        payload_json: payload,
      }).select("id").single();
      const localId = ins?.id;

      let res: Response;
      try {
        res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}/econf`, {
          method: "POST",
          headers: { "Authorization": auth, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (netErr) {
        const isTimeout = (netErr as Error)?.name === "AbortError";
        const errCode = isTimeout ? "timeout_sefaz" : "network_error";
        if (localId) await supabase.from("fiscal_econf_events").update({ status: "rejected", response_json: { error: errCode } }).eq("id", localId);
        return fail(errCode, isTimeout ? "Timeout" : "Falha de rede");
      }
      const data: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.mensagem || `Focus retornou ${res.status}`;
        if (localId) await supabase.from("fiscal_econf_events").update({
          status: "rejected", response_json: data,
        }).eq("id", localId);
        return fail("focus_error", String(msg), { status: res.status, body: data });
      }

      const protocolo = data?.numero_protocolo || data?.protocolo || null;
      const focusStatus = String(data?.status || "").toLowerCase();
      const newStatus = focusStatus === "autorizado" || focusStatus === "registrado" ? "registered" : (focusStatus || "processing");

      if (localId) await supabase.from("fiscal_econf_events").update({
        status: newStatus,
        protocolo,
        response_json: data,
      }).eq("id", localId);

      return ok({ id: localId, status: newStatus, protocolo, upstream: data });
    }

    // ─────────────────────────── CONSULT ───────────────────────────
    if (action === "consult") {
      const protocolo = String(body?.protocolo || "");
      if (!protocolo) return fail("invalid_payload", "protocolo obrigatório");

      const res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}/econf/${encodeURIComponent(protocolo)}`, {
        method: "GET", headers: { "Authorization": auth },
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) return fail("focus_error", data?.mensagem || `Focus retornou ${res.status}`, { status: res.status, body: data });

      // Atualiza registro local
      const { data: existing } = await supabase.from("fiscal_econf_events")
        .select("id").eq("invoice_id", invoice.id).eq("protocolo", protocolo).maybeSingle();
      if (existing?.id) {
        const focusStatus = String(data?.status || "").toLowerCase();
        const newStatus = focusStatus === "cancelado" ? "cancelled" : (focusStatus === "autorizado" || focusStatus === "registrado" ? "registered" : focusStatus);
        await supabase.from("fiscal_econf_events").update({
          status: newStatus, response_json: data,
        }).eq("id", existing.id);
      }
      return ok({ upstream: data });
    }

    // ─────────────────────────── CANCEL ───────────────────────────
    if (action === "cancel") {
      const protocolo = String(body?.protocolo || "");
      const justificativa = String(body?.justificativa || "").trim();
      if (!protocolo) return fail("invalid_payload", "protocolo obrigatório");
      if (justificativa.length < 15) return fail("invalid_payload", "Justificativa mínima 15 caracteres");

      const res = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}/econf/${encodeURIComponent(protocolo)}`, {
        method: "DELETE",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify({ justificativa }),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) return fail("focus_error", data?.mensagem || `Focus retornou ${res.status}`, { status: res.status, body: data });

      const { data: existing } = await supabase.from("fiscal_econf_events")
        .select("id").eq("invoice_id", invoice.id).eq("protocolo", protocolo).maybeSingle();
      if (existing?.id) {
        await supabase.from("fiscal_econf_events").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_reason: justificativa,
          response_json: data,
        }).eq("id", existing.id);
      }
      return ok({ status: "cancelled", upstream: data });
    }

    return fail("invalid_action", "action desconhecida");
  } catch (e) {
    console.error("[fiscal-econf] fatal", { message: String((e as Error)?.message || e) });
    return fail("internal_error", String((e as Error)?.message || e));
  }
});