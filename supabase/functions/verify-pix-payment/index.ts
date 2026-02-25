import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_PROVIDERS = ["mercadopago", "pagseguro", "efi", "asaas", "openpix"];

const PROVIDER_NAMES: Record<string, string> = {
  mercadopago: "Mercado Pago",
  pagseguro: "PagSeguro",
  efi: "EFI (Gerencianet)",
  asaas: "Asaas",
  openpix: "OpenPix (Woovi)",
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    // Check if provider is supported
    if (!SUPPORTED_PROVIDERS.includes(pix_gateway_provider)) {
      const name = PROVIDER_NAMES[pix_gateway_provider] || pix_gateway_provider;
      return new Response(
        JSON.stringify({
          error: `Integração com ${name} em desenvolvimento. Use Mercado Pago, PagSeguro, EFI, Asaas ou OpenPix.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let qr_code: string | null = null;
    let qr_code_base64: string | null = null;
    let payment_id: string | null = null;
    let pix_copia_e_cola: string | null = null;

    // ── Mercado Pago ──
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

    // ── PagSeguro ──
    } else if (pix_gateway_provider === "pagseguro") {
      const pgRes = await fetch("https://api.pagseguro.com/instant-payments/cob", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pix_gateway_token}`,
        },
        body: JSON.stringify({
          calendario: { expiracao: 3600 },
          valor: { original: parseFloat(amount).toFixed(2) },
          chave: "",
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

    // ── EFI (Gerencianet) ──
    } else if (pix_gateway_provider === "efi") {
      // Token format: clientId:clientSecret
      const [clientId, clientSecret] = pix_gateway_token.split(":");
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: "Token EFI inválido. Use o formato clientId:clientSecret" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get OAuth token
      const authRes = await fetch("https://pix.api.efipay.com.br/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: JSON.stringify({ grant_type: "client_credentials" }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        console.error("EFI auth error:", JSON.stringify(authData));
        return new Response(
          JSON.stringify({ error: "Erro na autenticação EFI", details: authData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const accessToken = authData.access_token;

      // Create cobranças
      const txid = order_id.replace(/-/g, "").slice(0, 35);
      const cobRes = await fetch(`https://pix.api.efipay.com.br/v2/cob/${txid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          calendario: { expiracao: 3600 },
          valor: { original: parseFloat(amount).toFixed(2) },
          solicitacaoPagador: description || "Pedido PIX",
        }),
      });
      const cobData = await cobRes.json();
      if (!cobRes.ok) {
        console.error("EFI cob error:", JSON.stringify(cobData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar cobrança na EFI", details: cobData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payment_id = cobData.txid;
      pix_copia_e_cola = cobData.pixCopiaECola ?? null;
      qr_code = pix_copia_e_cola;

      // Get QR code
      if (payment_id) {
        const qrRes = await fetch(`https://pix.api.efipay.com.br/v2/loc/${cobData.loc?.id}/qrcode`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (qrRes.ok) {
          const qrData = await qrRes.json();
          qr_code_base64 = qrData.imagemQrcode ?? null;
        }
      }

    // ── Asaas ──
    } else if (pix_gateway_provider === "asaas") {
      // Create payment
      const asaasRes = await fetch("https://api.asaas.com/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": pix_gateway_token,
        },
        body: JSON.stringify({
          billingType: "PIX",
          value: parseFloat(amount),
          description: description || "Pedido PIX",
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          externalReference: order_id,
        }),
      });
      const asaasData = await asaasRes.json();
      if (!asaasRes.ok) {
        console.error("Asaas error:", JSON.stringify(asaasData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar cobrança no Asaas", details: asaasData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payment_id = asaasData.id;

      // Get PIX QR code
      const qrRes = await fetch(`https://api.asaas.com/v3/payments/${payment_id}/pixQrCode`, {
        headers: { "access_token": pix_gateway_token },
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        pix_copia_e_cola = qrData.payload ?? null;
        qr_code = pix_copia_e_cola;
        qr_code_base64 = qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : null;
      }

    // ── OpenPix (Woovi) ──
    } else if (pix_gateway_provider === "openpix") {
      const opRes = await fetch("https://api.openpix.com.br/api/v1/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: pix_gateway_token,
        },
        body: JSON.stringify({
          correlationID: order_id,
          value: Math.round(parseFloat(amount) * 100), // OpenPix uses cents
          comment: description || "Pedido PIX",
        }),
      });
      const opData = await opRes.json();
      if (!opRes.ok) {
        console.error("OpenPix error:", JSON.stringify(opData));
        return new Response(
          JSON.stringify({ error: "Erro ao criar cobrança na OpenPix", details: opData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      payment_id = opData.charge?.correlationID || order_id;
      pix_copia_e_cola = opData.charge?.brCode ?? null;
      qr_code = pix_copia_e_cola;
      qr_code_base64 = opData.charge?.qrCodeImage ? opData.charge.qrCodeImage : null;
    }

    // Store gateway_payment_id on the order
    await supabase
      .from("orders")
      .update({ gateway_payment_id: payment_id })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({ payment_id, qr_code, qr_code_base64, pix_copia_e_cola }),
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
