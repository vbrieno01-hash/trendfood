import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, order_id, amount, description } = await req.json();

    if (!organization_id || !order_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: organization_id, order_id, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to read secrets
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch gateway credentials
    const { data: secrets, error: secretsError } = await supabase
      .from("organization_secrets")
      .select("pix_gateway_provider, pix_gateway_token")
      .eq("organization_id", organization_id)
      .maybeSingle();

    if (secretsError || !secrets?.pix_gateway_provider || !secrets?.pix_gateway_token) {
      return new Response(
        JSON.stringify({ error: "Gateway PIX não configurado para esta loja." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pix_gateway_provider, pix_gateway_token } = secrets;
    let qr_code: string | null = null;
    let qr_code_base64: string | null = null;
    let payment_id: string | null = null;
    let pix_copia_e_cola: string | null = null;

    if (pix_gateway_provider === "mercadopago") {
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pix_gateway_token}`,
          "X-Idempotency-Key": order_id,
        },
        body: JSON.stringify({
          transaction_amount: parseFloat(amount),
          description: description || "Pedido PIX",
          payment_method_id: "pix",
          payer: { email: "cliente@pedido.com" },
        }),
      });

      const mpData = await mpRes.json();

      if (!mpRes.ok) {
        console.error("Mercado Pago error:", JSON.stringify(mpData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar cobrança no Mercado Pago", details: mpData.message || mpData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payment_id = String(mpData.id);
      qr_code = mpData.point_of_interaction?.transaction_data?.qr_code ?? null;
      qr_code_base64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
      pix_copia_e_cola = qr_code;

    } else if (pix_gateway_provider === "pagseguro") {
      // PagSeguro/PagBank PIX API
      const pgRes = await fetch("https://api.pagseguro.com/instant-payments/cob", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pix_gateway_token}`,
        },
        body: JSON.stringify({
          calendario: { expiracao: 3600 },
          valor: { original: parseFloat(amount).toFixed(2) },
          chave: "", // Uses default key from PagSeguro account
          solicitacaoPagador: description || "Pedido PIX",
          infoAdicionais: [{ nome: "Pedido", valor: order_id }],
        }),
      });

      const pgData = await pgRes.json();

      if (!pgRes.ok) {
        console.error("PagSeguro error:", JSON.stringify(pgData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar cobrança no PagSeguro", details: pgData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payment_id = pgData.txid || pgData.id;
      pix_copia_e_cola = pgData.pixCopiaECola ?? null;
      qr_code = pix_copia_e_cola;
      qr_code_base64 = pgData.qrcode?.imagemBase64 ?? null;

    } else {
      return new Response(
        JSON.stringify({ error: `Gateway "${pix_gateway_provider}" não suportado.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store gateway_payment_id on the order
    await supabase
      .from("orders")
      .update({ gateway_payment_id: payment_id })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        payment_id,
        qr_code,
        qr_code_base64,
        pix_copia_e_cola,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("verify-pix-payment error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
