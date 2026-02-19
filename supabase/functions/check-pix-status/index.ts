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

    // Fetch gateway credentials
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
    let paid = false;
    let status = "unknown";

    if (pix_gateway_provider === "mercadopago") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { Authorization: `Bearer ${pix_gateway_token}` },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "approved";

    } else if (pix_gateway_provider === "pagseguro") {
      const res = await fetch(`https://api.pagseguro.com/instant-payments/cob/${payment_id}`, {
        headers: { Authorization: `Bearer ${pix_gateway_token}` },
      });
      const data = await res.json();
      status = data.status || "unknown";
      paid = status === "CONCLUIDA";

    } else {
      return new Response(
        JSON.stringify({ error: `Gateway "${pix_gateway_provider}" não suportado.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If paid, update order status from awaiting_payment to pending
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
