import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Focus NFe webhook payload (form or json): { ref, status, chave_nfe, numero, serie, protocolo,
//   caminho_xml_nota_fiscal, caminho_danfe, qrcode, motivo_status }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const expected = Deno.env.get("FOCUS_NFE_WEBHOOK_TOKEN");
    const got = req.headers.get("x-webhook-token") || new URL(req.url).searchParams.get("token");
    // Fail-closed: sempre exige o token; se secret não configurado, recusa
    if (!expected) return json({ error: "webhook not configured" }, 503);
    if (got !== expected) return json({ error: "invalid token" }, 401);

    // Focus can send form-urlencoded or json
    let payload: any = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData().catch(() => null);
      if (form) form.forEach((v, k) => (payload[k] = v));
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ref = String(payload.ref || "");
    const chave = payload.chave_nfe || payload.chave;
    const status = String(payload.status || "").toLowerCase();
    const numero = payload.numero;
    const serie = payload.serie;
    const protocolo = payload.protocolo;
    const qrcode = payload.qrcode || payload.qrcode_url;
    const motivo = payload.mensagem_sefaz || payload.motivo_status || payload.motivo;
    const idIntegracao = ref.startsWith("order_") ? ref.slice("order_".length) : null;
    console.log("[fiscal-focus-webhook] recebido", { ref, status, chave });

    if (!idIntegracao && !chave) return json({ error: "missing identifier" }, 400);

    let query = supabase.from("fiscal_invoices").select("*").limit(1);
    if (idIntegracao) query = query.eq("order_id", idIntegracao);
    else if (chave) query = query.eq("chave_acesso", chave);
    const { data: invRows } = await query;
    const inv = invRows?.[0];
    if (!inv) return json({ ok: true, ignored: true });

    // Escolhe host correto pelo ambiente da nota (homologacao vs producao)
    const hostByEnv = inv.environment === "producao"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";
    const xml = payload.caminho_xml_nota_fiscal ? `${hostByEnv}${payload.caminho_xml_nota_fiscal}` : null;
    const danfe = payload.caminho_danfe ? `${hostByEnv}${payload.caminho_danfe}` : null;

    let newStatus = inv.status;
    if (status.includes("autoriz")) newStatus = "authorized";
    else if (["rejeit", "erro", "denegad"].some(s => status.includes(s))) newStatus = "rejected";
    else if (status.includes("cancel")) newStatus = "cancelled";

    const patch: Record<string, unknown> = { status: newStatus };
    if (chave) patch.chave_acesso = chave;
    if (numero) patch.numero = numero;
    if (serie) patch.serie = serie;
    if (protocolo) patch.protocolo = protocolo;
    if (xml) patch.xml_url = xml;
    if (danfe) patch.danfe_url = danfe;
    if (qrcode) patch.qrcode_url = qrcode;
    if (motivo && newStatus === "rejected") patch.rejection_reason = String(motivo).slice(0, 500);
    if (newStatus === "authorized") patch.emitted_at = new Date().toISOString();
    if (newStatus === "cancelled") patch.cancelled_at = new Date().toISOString();

    await supabase.from("fiscal_invoices").update(patch).eq("id", inv.id);
    await supabase.from("orders").update({ fiscal_status: newStatus, fiscal_invoice_id: inv.id }).eq("id", inv.order_id);

    // Contabiliza uso mensal (idempotente por invoice_id UNIQUE) só quando autorizada.
    if (newStatus === "authorized") {
      const monthStart = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartDate = monthStart.toISOString().slice(0, 10);
      await supabase.from("fiscal_usage_log").upsert({
        organization_id: inv.organization_id,
        invoice_id: inv.id,
        month_start: monthStartDate,
      }, { onConflict: "invoice_id", ignoreDuplicates: true });
    }

    if (newStatus === "authorized" && inv.environment === "homologacao") {
      await supabase.from("fiscal_config").update({ producao_liberada: true })
        .eq("organization_id", inv.organization_id).eq("producao_liberada", false);
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});