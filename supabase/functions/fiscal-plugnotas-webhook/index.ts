import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const expected = Deno.env.get("PLUGNOTAS_WEBHOOK_TOKEN");
    const got = req.headers.get("x-webhook-token");
    if (expected && got !== expected) return json({ error: "invalid token" }, 401);

    const payload = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const idIntegracao = payload.idIntegracao || payload.data?.idIntegracao;
    const chave = payload.chave || payload.chaveAcesso || payload.data?.chave;
    const status = String(payload.status || payload.situacao || payload.data?.status || "").toLowerCase();
    const numero = payload.numero || payload.data?.numero;
    const serie = payload.serie || payload.data?.serie;
    const protocolo = payload.protocolo || payload.data?.protocolo;
    const xml = payload.xml || payload.xmlUrl || payload.data?.xml;
    const danfe = payload.danfe || payload.danfeUrl || payload.data?.danfe;
    const qrcode = payload.qrCode || payload.qrcode || payload.data?.qrCode;
    const motivo = payload.motivo || payload.mensagemSefaz || payload.data?.motivo;

    if (!idIntegracao && !chave) return json({ error: "missing identifier" }, 400);

    let query = supabase.from("fiscal_invoices").select("*").limit(1);
    if (idIntegracao) query = query.eq("order_id", idIntegracao);
    else if (chave) query = query.eq("chave_acesso", chave);
    const { data: invRows } = await query;
    const inv = invRows?.[0];
    if (!inv) return json({ ok: true, ignored: true });

    let newStatus = inv.status;
    if (["autorizado", "autorizada", "authorized", "concluid"].some(s => status.includes(s))) newStatus = "authorized";
    else if (["rejeit", "rejected", "erro"].some(s => status.includes(s))) newStatus = "rejected";
    else if (["cancel"].some(s => status.includes(s))) newStatus = "cancelled";

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

    if (newStatus === "authorized" && inv.environment === "homologacao") {
      await supabase.from("fiscal_config").update({ producao_liberada: true })
        .eq("organization_id", inv.organization_id).eq("producao_liberada", false);
    }

    return json({ ok: true, status: newStatus });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});