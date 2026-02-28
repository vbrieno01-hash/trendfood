import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email!;

    const { org_id, plan, cpf_cnpj, payment_method, card_token } = await req.json();

    if (!org_id || !plan || !cpf_cnpj || !payment_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate org ownership
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, user_id")
      .eq("id", org_id)
      .single();

    if (orgError || !org || org.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Organization not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan pricing
    const planPrices: Record<string, number> = {
      pro: 99.0,
      enterprise: 249.0,
    };
    const amount = planPrices[plan];
    if (!amount) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build MP payment body
    const cleanDoc = cpf_cnpj.replace(/\D/g, "");
    const docType = cleanDoc.length <= 11 ? "CPF" : "CNPJ";

    const paymentBody: Record<string, unknown> = {
      transaction_amount: amount,
      description: `Assinatura ${plan.charAt(0).toUpperCase() + plan.slice(1)} - ${org.name}`,
      payment_method_id: payment_method === "pix" ? "pix" : undefined,
      payer: {
        email: userEmail,
        identification: { type: docType, number: cleanDoc },
      },
      metadata: {
        org_id,
        plan,
        user_id: userId,
      },
    };

    if (payment_method === "card") {
      if (!card_token) {
        return new Response(JSON.stringify({ error: "Card token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      paymentBody.token = card_token;
      paymentBody.installments = 1;
      delete paymentBody.payment_method_id;
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${org_id}-${plan}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[create-mp-payment] MP error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({
          error: "Payment creation failed",
          details: mpData.message || mpData.cause?.[0]?.description || "Unknown error",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If card payment is approved immediately, update org
    if (mpData.status === "approved") {
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      await serviceClient
        .from("organizations")
        .update({
          subscription_plan: plan,
          subscription_status: "active",
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", org_id);

      await serviceClient.from("activation_logs").insert({
        organization_id: org_id,
        org_name: org.name,
        old_plan: null,
        new_plan: plan,
        old_status: null,
        new_status: "active",
        source: "mercadopago",
        notes: `Payment ${mpData.id} approved (card)`,
      });
    }

    // Build response
    const result: Record<string, unknown> = {
      status: mpData.status,
      status_detail: mpData.status_detail || null,
      payment_id: mpData.id,
    };

    console.log(`[create-mp-payment] status=${mpData.status} detail=${mpData.status_detail}`);

    if (payment_method === "pix" && mpData.point_of_interaction?.transaction_data) {
      result.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      result.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      result.pix_expiration = mpData.date_of_expiration;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-mp-payment] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
