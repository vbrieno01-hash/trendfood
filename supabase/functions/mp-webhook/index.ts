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
    const body = await req.json();
    console.log("[mp-webhook] Received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    // We care about "payment" type notifications
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from MP
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[mp-webhook] Failed to fetch payment:", JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[mp-webhook] Payment status:", mpData.status, "metadata:", JSON.stringify(mpData.metadata));

    if (mpData.status !== "approved") {
      return new Response(JSON.stringify({ received: true, status: mpData.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract org_id and plan from metadata
    const orgId = mpData.metadata?.org_id;
    const plan = mpData.metadata?.plan;

    if (!orgId || !plan) {
      console.error("[mp-webhook] Missing metadata org_id or plan");
      return new Response(JSON.stringify({ error: "Missing metadata" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get current org data
    const { data: org } = await supabase
      .from("organizations")
      .select("subscription_plan, subscription_status, name")
      .eq("id", orgId)
      .single();

    // Update organization
    const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("organizations")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        trial_ends_at: trialEnds,
      })
      .eq("id", orgId);

    // Log activation
    await supabase.from("activation_logs").insert({
      organization_id: orgId,
      org_name: org?.name || null,
      old_plan: org?.subscription_plan || null,
      new_plan: plan,
      old_status: org?.subscription_status || null,
      new_status: "active",
      source: "mercadopago",
      notes: `Webhook payment ${paymentId} approved (${mpData.payment_method_id || "unknown"})`,
    });

    console.log("[mp-webhook] Org updated:", orgId, "plan:", plan);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[mp-webhook] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
