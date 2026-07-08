import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
// Envelope: sempre 200 para erros esperados, evita "Edge Function returned a non-2xx status code" no supabase-js.
function ok(data: Record<string, unknown> = {}) {
  return json({ ok: true, ...data }, 200);
}
function fail(code: string, message: string, detail?: unknown) {
  console.warn("[fiscal-emit] fail", { code, message, detail });
  return json({ ok: false, code, message, detail }, 200);
}
function log(step: string, extra: Record<string, unknown> = {}) {
  console.log(`[fiscal-emit] ${step}`, extra);
}

// Focus NFe forma_pagamento SEFAZ codes
function mapPay(m: string | null | undefined): "01" | "03" | "04" | "17" | "99" {
  const s = (m || "").toLowerCase();
  if (s.includes("pix")) return "17";
  if (s.includes("credit") || s.includes("crédit")) return "03";
  if (s.includes("deb")) return "04";
  if (s.includes("dinh") || s.includes("cash") || s.includes("espec")) return "01";
  return "99";
}

// Timeout wrapper — SEFAZ costuma responder <3s; 15s cobre picos sem travar edge.
async function fetchWithTimeout(url: string, opts: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Resolve o token Focus NFe conforme configuração da loja.
// mode='own'  -> lê organization_secrets.focus_nfe_token
// mode='platform' (default) -> usa FOCUS_NFE_TOKEN (Software House)
async function getFocusToken(supabase: any, orgId: string, mode: string | null | undefined): Promise<string | null> {
  if (mode === "own") {
    const { data } = await supabase.from("organization_secrets")
      .select("focus_nfe_token").eq("organization_id", orgId).maybeSingle();
    return data?.focus_nfe_token || null;
  }
  return Deno.env.get("FOCUS_NFE_TOKEN") || null;
}

Deno.serve(async (req) => {
  console.log("[fiscal-emit-nfce] Função iniciada", {
    method: req.method,
    url: req.url,
    has_auth: !!req.headers.get("Authorization"),
    has_internal: !!req.headers.get("x-fiscal-token"),
    ts: new Date().toISOString(),
  });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  let step = "init";
  let order_id_ctx: string | undefined;
  try {
    // Auth: aceita (a) token interno do auto-trigger  OU  (b) JWT do dono da loja
    step = "auth";
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
    log("auth_ok", { viaInternal, userId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    step = "parse_body";
    const body = await req.json().catch(() => ({}));
    const { order_id } = body || {};
    if (!order_id) return fail("invalid_payload", "order_id obrigatório");
    if (typeof order_id !== "string" || order_id.length > 64) return fail("invalid_payload", "order_id inválido");
    order_id_ctx = order_id;

    // Idempotency
    step = "idempotency";
    const { data: existing } = await supabase.from("fiscal_invoices").select("*").eq("order_id", order_id).maybeSingle();
    if (existing && ["processing", "authorized"].includes(existing.status)) {
      log("already", { invoice_id: existing.id, status: existing.status });
      return ok({ already: true, invoice: existing });
    }

    step = "load_order";
    const { data: order, error: oErr } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (oErr) return fail("order_load_error", "Falha ao carregar pedido", oErr.message);
    if (!order) return fail("order_not_found", "Pedido não encontrado");
    log("order_loaded", { org: order.organization_id });

    // Se veio de usuário, exige que ele seja dono da org do pedido
    if (userId) {
      step = "authz";
      const { data: org } = await supabase.from("organizations").select("user_id").eq("id", order.organization_id).maybeSingle();
      if (!org || org.user_id !== userId) return fail("forbidden", "Você não tem permissão para emitir NFC-e deste pedido");
    }

    step = "load_items";
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order_id);
    if (!items?.length) return fail("no_items", "Pedido sem itens");

    step = "load_cfg";
    const { data: cfg } = await supabase.from("fiscal_config").select("*").eq("organization_id", order.organization_id).maybeSingle();
    if (!cfg || !cfg.enabled) return fail("fiscal_disabled", "Módulo fiscal desativado nas configurações");
    if (!cfg.cnpj) return fail("missing_cnpj", "CNPJ da empresa não configurado");
    log("cfg_loaded", { environment: cfg.environment, token_mode: cfg.focus_token_mode });

    // Quota gate — antes de qualquer chamada externa.
    step = "quota_check";
    const { data: quota, error: qErr } = await supabase.rpc("fiscal_check_quota", { _org_id: order.organization_id });
    if (qErr) log("quota_rpc_error", { message: qErr.message });
    log("quota", quota || {});
    if (quota?.blocked && !quota?.overage_allowed) {
      // Registra tentativa bloqueada (upsert por order_id — que é UNIQUE em fiscal_invoices).
      const blockedPatch = {
        organization_id: order.organization_id,
        order_id,
        status: "blocked_quota",
        environment: cfg.environment,
        rejection_reason: String(quota?.reason || "Cota mensal esgotada").slice(0, 500),
      };
      // upsert por order_id (UNIQUE) — evita race entre invocações concorrentes
      await supabase.from("fiscal_invoices").upsert(blockedPatch, { onConflict: "order_id" });
      return fail("quota_exceeded", "Cota mensal de NFC-e esgotada", quota);
    }

    // Resolve token conforme modo (platform | own).
    step = "resolve_token";
    const token = await getFocusToken(supabase, order.organization_id, cfg.focus_token_mode);
    if (!token) {
      const msg = cfg.focus_token_mode === "own"
        ? "Token Focus NFe do lojista não configurado"
        : "FOCUS_NFE_TOKEN not configured";
      return fail("missing_token", msg);
    }
    log("token_ok", { mode: cfg.focus_token_mode || "platform" });

    // Rate limit: máx 100 emissões/hora/org
    step = "rate_limit";
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase.from("fiscal_invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", order.organization_id)
      .gte("created_at", oneHourAgo);
    if ((recentCount || 0) >= 100) {
      return fail("rate_limited", "Máximo 100 emissões por hora atingido");
    }

    // Fetch menu_items for fiscal fields
    step = "load_menu";
    const menuIds = items.map((i: any) => i.menu_item_id).filter(Boolean);
    const { data: menus } = menuIds.length
      ? await supabase.from("menu_items").select("id, ncm, cest, cfop, origem, cst_csosn, unidade, codigo_ean").in("id", menuIds)
      : { data: [] as any[] };
    const menuMap = new Map((menus || []).map((m: any) => [m.id, m]));

    step = "build_payload";
    let totalProdutos = 0;
    const nfItems = items.map((it: any, idx: number) => {
      const m = menuMap.get(it.menu_item_id) || {};
      const unitPrice = Number(it.price);
      const qty = Number(it.quantity || 1);
      const total = +(unitPrice * qty).toFixed(2);
      totalProdutos += total;
      return {
        numero_item: idx + 1,
        codigo_produto: (it.menu_item_id?.slice(0, 20) || String(idx + 1)),
        descricao: (it.name || "Item").slice(0, 120),
        codigo_ncm: (m as any).ncm || cfg.default_ncm || "21069090",
        codigo_cest: (m as any).cest || cfg.default_cest || undefined,
        cfop: (m as any).cfop || cfg.cfop_padrao || "5102",
        unidade_comercial: (m as any).unidade || cfg.default_unidade || "UN",
        quantidade_comercial: qty,
        valor_unitario_comercial: unitPrice,
        valor_unitario_tributavel: unitPrice,
        unidade_tributavel: (m as any).unidade || cfg.default_unidade || "UN",
        quantidade_tributavel: qty,
        valor_bruto: total,
        codigo_barras_comercial: (m as any).codigo_ean || "SEM GTIN",
        codigo_barras_tributavel: (m as any).codigo_ean || "SEM GTIN",
        // Focus NFe v2 schema exige `icms_origem` (string). Mantemos `origem` como alias
        // por compatibilidade com integrações internas antigas.
        icms_origem: String((m as any).origem ?? cfg.default_origem ?? 0),
        origem: (m as any).origem ?? cfg.default_origem ?? 0,
        icms_situacao_tributaria: (m as any).cst_csosn || cfg.default_cst_csosn || "102",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
        inclui_no_total: 1,
      };
    });

    const discount = Number(order.discount_value || 0);
    const totalNota = +(totalProdutos - discount).toFixed(2);
    const cnpjClean = (cfg.cnpj || "").replace(/\D/g, "");

    // Validações defensivas pré-Focus
    if (nfItems.length === 0) return fail("invalid_payload", "Nenhum item válido para emissão");
    if (!(totalNota > 0)) return fail("invalid_payload", "Valor total da nota deve ser positivo", { totalNota });
    if (cnpjClean.length !== 14) return fail("invalid_payload", "CNPJ do emitente inválido", { cnpj_len: cnpjClean.length });

    const payload = {
      natureza_operacao: "VENDA AO CONSUMIDOR",
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      presenca_comprador: 1,
      finalidade_emissao: 1,
      consumidor_final: 1,
      // Campos obrigatórios pela spec OpenAPI oficial (Focus NFe v2)
      modalidade_frete: "9", // 9 = sem frete (NFC-e balcão/delivery próprio)
      local_destino: "1",    // 1 = operação interna (UF do consumidor = UF do emitente)
      cnpj_emitente: cnpjClean,
      items: nfItems,
      formas_pagamento: [{
        forma_pagamento: mapPay(order.payment_method),
        valor_pagamento: totalNota,
      }],
      valor_desconto: discount || undefined,
      informacoes_adicionais_contribuinte: `Pedido #${order.order_number || order.id.slice(0, 8)}`,
    };
    log("payload_built", { n_items: nfItems.length, total: totalNota });

    // Upsert as processing
    step = "upsert_processing";
    let invoiceId = existing?.id;
    if (!invoiceId) {
      const { data: ins } = await supabase.from("fiscal_invoices").insert({
        organization_id: order.organization_id,
        order_id,
        status: "processing",
        environment: cfg.environment,
        payload_json: payload,
        attempts: 1,
      }).select("id").single();
      invoiceId = ins?.id;
    } else {
      await supabase.from("fiscal_invoices").update({
        status: "processing", attempts: (existing.attempts || 0) + 1, payload_json: payload, rejection_reason: null,
      }).eq("id", invoiceId);
    }

    // Focus NFe: POST /v2/nfce?ref=<idempotency-key>
    // homologacao -> homologacao.focusnfe.com.br, producao -> api.focusnfe.com.br
    step = "focus_request";
    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const ref = `order_${order_id}`;
    const auth = "Basic " + btoa(`${token}:`);
    log("focus_request", { host, ref });
    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce?ref=${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      const msg = (netErr as Error)?.name === "AbortError" ? "timeout_sefaz" : "network_error";
      console.error("[fiscal-emit] network_error", { msg, err: String((netErr as Error).message || netErr) });
      await supabase.from("fiscal_invoices").update({
        status: "rejected", rejection_reason: msg,
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      return fail(msg, msg === "timeout_sefaz" ? "Tempo esgotado ao contatar a SEFAZ" : "Falha de rede ao contatar Focus NFe");
    }
    let data: any = await res.json().catch(() => ({}));
    log("focus_response", { status: res.status, ok: res.ok, body_keys: Object.keys(data || {}) });

    if (!res.ok) {
      // 422 idempotentes — a nota pode já ter sido processada por chamada anterior.
      const focusCode = String((data as any)?.codigo || "");
      if (res.status === 422 && (focusCode === "already_processed" || focusCode === "pending_operation")) {
        log("focus_idempotent_422", { focusCode });
        try {
          const consultRes = await fetchWithTimeout(`${host}/v2/nfce/${encodeURIComponent(ref)}`, {
            method: "GET",
            headers: { "Authorization": auth },
          }, 10000);
          const consultData = await consultRes.json().catch(() => ({}));
          log("focus_consult_after_422", { status: consultRes.status, body_keys: Object.keys(consultData || {}) });
          if (consultRes.ok && consultData && typeof consultData === "object") {
            data = consultData;
            // cai para o bloco síncrono abaixo
          } else {
            // Ainda pendente na SEFAZ — mantém processing e deixa webhook resolver.
            return ok({ invoice_id: invoiceId, ref, pending: true, upstream: consultData });
          }
        } catch (consultErr) {
          log("focus_consult_error", { err: String((consultErr as Error).message || consultErr) });
          return ok({ invoice_id: invoiceId, ref, pending: true });
        }
      } else {
        const detailMsg =
          (data as any)?.mensagem ||
          (data as any)?.mensagem_sefaz ||
          (data as any)?.erros?.[0]?.mensagem ||
          `Focus retornou ${res.status}`;
        await supabase.from("fiscal_invoices").update({
          status: "rejected",
          rejection_reason: String(detailMsg).slice(0, 500),
        }).eq("id", invoiceId!);
        await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
        return fail("focus_error", String(detailMsg), { status: res.status, body: data });
      }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Emissão SÍNCRONA — Focus NFe v2 retorna o resultado final no 201.
    // Ref: doc.focusnfe.com.br/reference/emitir_nfce.md
    //   status: "autorizado"      → grava tudo agora
    //   status: "erro_autorizacao"→ marca rejected
    //   sem status                → fallback antigo (webhook resolve)
    // ═════════════════════════════════════════════════════════════════════
    step = "persist_sync_response";
    const focusStatus = String((data as any)?.status || "").toLowerCase();
    const chave = (data as any)?.chave_nfe || null;
    const numero = (data as any)?.numero || null;
    const serie = (data as any)?.serie || null;
    const caminhoXml = (data as any)?.caminho_xml_nota_fiscal || null;
    const caminhoDanfe = (data as any)?.caminho_danfe || null;
    const qrcodeUrl = (data as any)?.qrcode_url || null;
    const mensagemSefaz = (data as any)?.mensagem_sefaz || null;
    // Focus retorna caminhos relativos — prefixamos com o host correto do ambiente.
    const fullXml = caminhoXml ? (caminhoXml.startsWith("http") ? caminhoXml : `${host}${caminhoXml}`) : null;
    const fullDanfe = caminhoDanfe ? (caminhoDanfe.startsWith("http") ? caminhoDanfe : `${host}${caminhoDanfe}`) : null;

    if (focusStatus === "autorizado") {
      await supabase.from("fiscal_invoices").update({
        status: "authorized",
        plugnotas_id: ref,
        chave_acesso: chave,
        numero,
        serie,
        xml_url: fullXml,
        danfe_url: fullDanfe,
        qrcode_url: qrcodeUrl,
        emitted_at: new Date().toISOString(),
        rejection_reason: null,
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({
        fiscal_status: "authorized",
        fiscal_invoice_id: invoiceId,
      }).eq("id", order_id);
      // Contabilização de cota — upsert por invoice_id (UNIQUE) para evitar duplicação
      // caso o webhook também chegue depois.
      await supabase.from("fiscal_usage_log").upsert({
        organization_id: order.organization_id,
        invoice_id: invoiceId,
        environment: cfg.environment,
      }, { onConflict: "invoice_id" });
      log("db_updated_sync_authorized", { invoice_id: invoiceId, chave });
      return ok({ invoice_id: invoiceId, ref, status: "authorized", upstream: data });
    }

    if (focusStatus === "erro_autorizacao") {
      const reason = mensagemSefaz || (data as any)?.mensagem || "Erro de autorização SEFAZ";
      await supabase.from("fiscal_invoices").update({
        status: "rejected",
        plugnotas_id: ref,
        rejection_reason: String(reason).slice(0, 500),
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      log("db_updated_sync_rejected", { invoice_id: invoiceId, reason });
      return ok({ invoice_id: invoiceId, ref, status: "rejected", upstream: data });
    }

    // Fallback — resposta 2xx sem status conhecido: mantém processing e webhook decide.
    step = "persist_ref";
    await supabase.from("fiscal_invoices").update({ plugnotas_id: ref }).eq("id", invoiceId!);
    await supabase.from("orders").update({ fiscal_status: "processing", fiscal_invoice_id: invoiceId }).eq("id", order_id);
    log("db_updated_fallback_processing", { invoice_id: invoiceId, focusStatus });

    return ok({ invoice_id: invoiceId, ref, upstream: data });
  } catch (e) {
    console.error("[fiscal-emit] fatal", {
      step,
      order_id: order_id_ctx,
      message: String((e as Error)?.message || e),
      stack: (e as Error)?.stack,
    });
    return fail("internal_error", String((e as Error)?.message || e), { step });
  }
});
      const detailMsg =
        (data as any)?.mensagem ||
        (data as any)?.mensagem_sefaz ||
        (data as any)?.erros?.[0]?.mensagem ||
        `Focus retornou ${res.status}`;
      await supabase.from("fiscal_invoices").update({
        status: "rejected",
        rejection_reason: String(detailMsg).slice(0, 500),
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      return fail("focus_error", String(detailMsg), { status: res.status, body: data });
    }

    // Focus returns { status: "processando_autorizacao", ref, ... }
    step = "persist_ref";
    await supabase.from("fiscal_invoices").update({ plugnotas_id: ref }).eq("id", invoiceId!);
    await supabase.from("orders").update({ fiscal_status: "processing", fiscal_invoice_id: invoiceId }).eq("id", order_id);
    log("db_updated", { invoice_id: invoiceId, status: "processing" });

    return ok({ invoice_id: invoiceId, ref, upstream: data });
  } catch (e) {
    console.error("[fiscal-emit] fatal", {
      step,
      order_id: order_id_ctx,
      message: String((e as Error)?.message || e),
      stack: (e as Error)?.stack,
    });
    return fail("internal_error", String((e as Error)?.message || e), { step });
  }
});