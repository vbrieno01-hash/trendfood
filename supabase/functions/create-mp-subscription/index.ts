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
    // Authenticate user
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = user.email!;
    const userId = user.id;

    const { org_id, plan, card_token_id } = await req.json();
    if (!org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing org_id or plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns the org
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, user_id, mp_subscription_id")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (org.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan price from database
    const { data: planRow, error: planError } = await supabaseAdmin
      .from("platform_plans")
      .select("name, price_cents")
      .eq("key", plan)
      .eq("active", true)
      .single();

    if (planError || !planRow) {
      console.error("[create-mp-subscription] Plan not found:", plan, planError);
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (planRow.price_cents === 0) {
      return new Response(JSON.stringify({ error: "Cannot create subscription for a free plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = planRow.price_cents / 100;

    // If there's already an active subscription, cancel it first
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (org.mp_subscription_id) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${org.mp_subscription_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch (e) {
        console.log("[create-mp-subscription] Failed to cancel old sub:", e);
      }
    }

    // Build back_url
    const backUrl = `https://trendfood.lovable.app/dashboard?tab=subscription&mp_return=true`;

    // Create preapproval (subscription)
    const preapprovalBody: Record<string, unknown> = {
      reason: `Assinatura ${planRow.name} - ${org.name}`,
      external_reference: org_id,
      payer_email: userEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "BRL",
      },
      back_url: backUrl,
      ...(card_token_id
        ? { card_token_id, status: "authorized" }
        : { status: "pending" }),
    };

    console.log("[create-mp-subscription] Creating preapproval:", JSON.stringify(preapprovalBody));

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("[create-mp-subscription] MP error:", JSON.stringify(mpData));
      return new Response(
        JSON.stringify({
          error: "Failed to create subscription",
          status_detail: mpData.cause?.[0]?.code || mpData.message || "unknown_error",
          message: mpData.message || "Pagamento recusado",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[create-mp-subscription] Created:", mpData.id, "init_point:", mpData.init_point);

    // Save subscription ID and plan metadata
    await supabaseAdmin
      .from("organizations")
      .update({ mp_subscription_id: mpData.id })
      .eq("id", org_id);

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        subscription_id: mpData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[create-mp-subscription] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
