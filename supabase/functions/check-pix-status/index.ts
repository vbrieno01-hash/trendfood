import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORTED_PROVIDERS = ["mercadopago", "pagseguro", "efi", "asaas", "openpix"];

const PROVIDER_NAMES: Record<string, string> = {
  inter: "Inter", sicredi: "Sicredi", bradesco: "Bradesco", itau: "Itaú",
  bb: "Banco do Brasil", santander: "Santander", caixa: "Caixa Econômica",
  nubank: "Nubank", c6bank: "C6 Bank", shipay: "Shipay",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organization_id, payment_id, order_id } = await req.json();

    if (!organization_id || !payment_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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
        JSON.stringify({ error: "Gateway não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pix_gateway_provider, pix_gateway_token } = secrets;

    // Check unsupported providers
    if (!SUPPORTED_PROVIDERS.includes(pix_gateway_provider)) {
      const name = PROVIDER_NAMES[pix_gateway_provider] || pix_gateway_provider;
      return new Response(
        JSON.stringify({ error: `Integração com ${name} em desenvolvimento. Use Mercado Pago, PagSeguro, EFI, Asaas ou OpenPix.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let paid = false;
    let status = "unknown";

    // ── Mercado Pago ──
    if (pix_gateway_provider === "mercadopago") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { Authorization: `Bearer ${pix_gateway_token}` },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "approved";

    // ── PagSeguro ──
    } else if (pix_gateway_provider === "pagseguro") {
      const res = await fetch(`https://api.pagseguro.com/instant-payments/cob/${payment_id}`, {
        headers: { Authorization: `Bearer ${pix_gateway_token}` },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "CONCLUIDA";

    // ── EFI (Gerencianet) ──
    } else if (pix_gateway_provider === "efi") {
      const [clientId, clientSecret] = pix_gateway_token.split(":");
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
        return new Response(
          JSON.stringify({ error: "Erro na autenticação EFI" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const res = await fetch(`https://pix.api.efipay.com.br/v2/cob/${payment_id}`, {
        headers: { Authorization: `Bearer ${authData.access_token}` },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "CONCLUIDA";

    // ── Asaas ──
    } else if (pix_gateway_provider === "asaas") {
      const res = await fetch(`https://api.asaas.com/v3/payments/${payment_id}`, {
        headers: { "access_token": pix_gateway_token },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "RECEIVED" || status === "CONFIRMED";

    // ── OpenPix ──
    } else if (pix_gateway_provider === "openpix") {
      const res = await fetch(`https://api.openpix.com.br/api/v1/charge/${payment_id}`, {
        headers: { Authorization: pix_gateway_token },
      });
      const data = await res.json();
      status = data.charge?.status || "unknown";
      paid = status === "COMPLETED";
    }

    // If paid, update order status
    if (paid && order_id) {
      await supabase
        .from("orders")
        .update({ status: "pending", paid: true })
        .eq("id", order_id)
        .eq("status", "awaiting_payment");
    }

    return new Response(
      JSON.stringify({ paid, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("check-pix-status error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
