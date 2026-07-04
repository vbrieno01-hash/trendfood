import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const PLUGNOTAS_BASE = "https://api.plugnotas.com.br";

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function mapPay(m: string | null | undefined): string {
  const s = (m || "").toLowerCase();
  if (s.includes("pix")) return "17";
  if (s.includes("credit") || s.includes("crédit") || s.includes("credit")) return "03";
  if (s.includes("deb")) return "04";
  if (s.includes("dinh") || s.includes("cash") || s.includes("espec")) return "01";
  return "99";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("PLUGNOTAS_API_KEY");
    if (!apiKey) return json({ error: "PLUGNOTAS_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { order_id } = body || {};
    if (!order_id) return json({ error: "order_id required" }, 400);

    // Idempotency
    const { data: existing } = await supabase.from("fiscal_invoices").select("*").eq("order_id", order_id).maybeSingle();
    if (existing && ["processing", "authorized"].includes(existing.status)) {
      return json({ ok: true, already: true, invoice: existing });
    }

    const { data: order, error: oErr } = await supabase.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (oErr || !order) return json({ error: "order not found" }, 404);

    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order_id);
    if (!items?.length) return json({ error: "order has no items" }, 400);

    const { data: cfg } = await supabase.from("fiscal_config").select("*").eq("organization_id", order.organization_id).maybeSingle();
    if (!cfg || !cfg.enabled) return json({ error: "fiscal not enabled" }, 400);
    if (!cfg.plugnotas_empresa_id) return json({ error: "empresa não cadastrada no PlugNotas" }, 400);

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
        numeroItem: idx + 1,
        codigo: it.menu_item_id?.slice(0, 8) || String(idx + 1),
        descricao: (it.name || "Item").slice(0, 120),
        ncm: (m as any).ncm || cfg.default_ncm || "21069090",
        cest: (m as any).cest || cfg.default_cest || undefined,
        cfop: (m as any).cfop || cfg.cfop_padrao || "5102",
        unidade: (m as any).unidade || cfg.default_unidade || "UN",
        quantidade: qty,
        valorUnitario: unitPrice,
        valorTotal: total,
        origem: (m as any).origem ?? cfg.default_origem ?? 0,
        codigoBarras: (m as any).codigo_ean || "SEM GTIN",
        icms: { situacaoTributaria: (m as any).cst_csosn || cfg.default_cst_csosn || "102" },
        pis: { situacaoTributaria: "07" },
        cofins: { situacaoTributaria: "07" },
      };
    });

    const discount = Number(order.discount_value || 0);
    const totalNota = +(totalProdutos - discount).toFixed(2);

    const payload = {
      idIntegracao: order_id,
      emitente: { cpfCnpj: (cfg.cnpj || "").replace(/\D/g, "") },
      natureza: "VENDA AO CONSUMIDOR",
      serie: cfg.serie_nfce || 1,
      presencial: 1,
      finalidade: 1,
      consumidorFinal: 1,
      itens: nfItems,
      totais: {
        valorProdutos: +totalProdutos.toFixed(2),
        valorDesconto: discount,
        valorTotal: totalNota,
      },
      pagamentos: [{
        formaPagamento: mapPay(order.payment_method),
        valor: totalNota,
      }],
      informacaoAdicional: { informacaoComplementar: `Pedido #${order.order_number || order.id.slice(0, 8)}` },
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

    const res = await fetch(`${PLUGNOTAS_BASE}/nfce`, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      await supabase.from("fiscal_invoices").update({
        status: "rejected",
        rejection_reason: JSON.stringify(data).slice(0, 500),
      }).eq("id", invoiceId!);
      await supabase.from("orders").update({ fiscal_status: "rejected" }).eq("id", order_id);
      return json({ error: "plugnotas_error", status: res.status, detail: data }, 400);
    }

    const pnId = data?.protocolo || data?.id || data?.data?.id;
    await supabase.from("fiscal_invoices").update({ plugnotas_id: pnId }).eq("id", invoiceId!);
    await supabase.from("orders").update({ fiscal_status: "processing", fiscal_invoice_id: invoiceId }).eq("id", order_id);

    return json({ ok: true, invoice_id: invoiceId, plugnotas_id: pnId });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});