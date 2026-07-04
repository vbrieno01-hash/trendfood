import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Auth: aceita (a) token interno do auto-trigger  OU  (b) JWT do dono da loja
    const internal = Deno.env.get("FISCAL_INTERNAL_TOKEN");
    const gotToken = req.headers.get("x-fiscal-token");
    const authHeader = req.headers.get("Authorization");
    const viaInternal = !!(internal && gotToken && gotToken === internal);

    let userId: string | null = null;
    if (!viaInternal) {
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: u } = await anonClient.auth.getUser();
      if (!u?.user) return json({ error: "Unauthorized" }, 401);
      userId = u.user.id;
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { order_id } = body || {};
    if (!order_id) return json({ error: "order_id required" }, 400);
    if (typeof order_id !== "string" || order_id.length > 64) return json({ error: "invalid order_id" }, 400);

    // Idempotency
    const { data: existing } = await supabase.from("fiscal_invoices").select("*").eq("order_id", order_id).maybeSingle();
    if (existing && ["processing", "authorized"].includes(existing.status)) {
      return json({ ok: true, already: true, invoice: existing });
    }

    const { data: order, error: oErr } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (oErr || !order) return json({ error: "order not found" }, 404);

    // Se veio de usuário, exige que ele seja dono da org do pedido
    if (userId) {
      const { data: org } = await supabase.from("organizations").select("user_id").eq("id", order.organization_id).maybeSingle();
      if (!org || org.user_id !== userId) return json({ error: "Forbidden" }, 403);
    }

    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order_id);
    if (!items?.length) return json({ error: "order has no items" }, 400);

    const { data: cfg } = await supabase.from("fiscal_config").select("*").eq("organization_id", order.organization_id).maybeSingle();
    if (!cfg || !cfg.enabled) return json({ error: "fiscal not enabled" }, 400);
    if (!cfg.cnpj) return json({ error: "CNPJ da empresa não configurado" }, 400);

    // Quota gate — antes de qualquer chamada externa.
    const { data: quota } = await supabase.rpc("fiscal_check_quota", { _org_id: order.organization_id });
    if (quota?.blocked && !quota?.overage_allowed) {
      // Registra tentativa bloqueada (upsert por order_id — que é UNIQUE em fiscal_invoices).
      const blockedPatch = {
        organization_id: order.organization_id,
        order_id,
        status: "blocked_quota",
        environment: cfg.environment,
        rejection_reason: String(quota?.reason || "Cota mensal esgotada").slice(0, 500),
      };
      if (existing?.id) {
        await supabase.from("fiscal_invoices").update(blockedPatch).eq("id", existing.id);
      } else {
        await supabase.from("fiscal_invoices").insert(blockedPatch);
      }
      return json({ error: "quota_exceeded", quota }, 429);
    }

    // Resolve token conforme modo (platform | own).
    const token = await getFocusToken(supabase, order.organization_id, cfg.focus_token_mode);
    if (!token) {
      const msg = cfg.focus_token_mode === "own"
        ? "Token Focus NFe do lojista não configurado"
        : "FOCUS_NFE_TOKEN not configured";
      return json({ error: msg }, 500);
    }

    // Rate limit: máx 100 emissões/hora/org
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase.from("fiscal_invoices")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", order.organization_id)
      .gte("created_at", oneHourAgo);
    if ((recentCount || 0) >= 100) {
      return json({ error: "rate_limit: máximo 100 emissões/hora por loja" }, 429);
    }

    // Fetch menu_items for fiscal fields
    const menuIds = items.map((i: any) => i.menu_item_id).filter(Boolean);
    const { data: menus } = menuIds.length
      ? await supabase.from("menu_items").select("id, ncm, cest, cfop, origem, cst_csosn, unidade, codigo_ean").in("id", menuIds)
      : { data: [] as any[] };
    const menuMap = new Map((menus || []).map((m: any) => [m.id, m]));

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
        origem: (m as any).origem ?? cfg.default_origem ?? 0,
        icms_situacao_tributaria: (m as any).cst_csosn || cfg.default_cst_csosn || "102",
        pis_situacao_tributaria: "07",
        cofins_situacao_tributaria: "07",
        inclui_no_total: 1,
      };
    });

    const discount = Number(order.discount_value || 0);
    const totalNota = +(totalProdutos - discount).toFixed(2);

    const payload = {
      natureza_operacao: "VENDA AO CONSUMIDOR",
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      presenca_comprador: 1,
      finalidade_emissao: 1,
      consumidor_final: 1,
      cnpj_emitente: (cfg.cnpj || "").replace(/\D/g, ""),
      items: nfItems,
      formas_pagamento: [{
        forma_pagamento: mapPay(order.payment_method),
        valor_pagamento: totalNota,
      }],
      valor_desconto: discount || undefined,
      informacoes_adicionais_contribuinte: `Pedido #${order.order_number || order.id.slice(0, 8)}`,
    };

    // Upsert as processing
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
    const host = cfg.environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
    const ref = `order_${order_id}`;
    const auth = "Basic " + btoa(`${token}:`);
    let res: Response;
    try {
      res = await fetchWithTimeout(`${host}/v2/nfce?ref=${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      const msg = (netErr as Error)?.name === "AbortError" ? "timeout_sefaz" : "network_error";
      await supabase.from("fiscal_invoices").update({
        status: "rejected", rejection_reason: msg,
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      return json({ error: msg }, 504);
    }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      await supabase.from("fiscal_invoices").update({
        status: "rejected",
        rejection_reason: JSON.stringify(data).slice(0, 500),
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      return json({ error: "plugnotas_error", status: res.status, detail: data }, 400);
    }

    // Focus returns { status: "processando_autorizacao", ref, ... }
    await supabase.from("fiscal_invoices").update({ plugnotas_id: ref }).eq("id", invoiceId!);
    await supabase.from("orders").update({ fiscal_status: "processing", fiscal_invoice_id: invoiceId }).eq("id", order_id);

    return json({ ok: true, invoice_id: invoiceId, ref, upstream: data });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});