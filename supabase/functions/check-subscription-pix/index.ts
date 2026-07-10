import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getRenewalDays(billing: string): number {
  if (billing === "quarterly") return 93;
  if (billing === "annual") return 370;
  return 30;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { payment_id, org_id, plan } = await req.json();

    if (!payment_id || !org_id || !plan) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ownership via posse do payment_id opaco + org_id (registro criado ao gerar o PIX)
    const { data: pending } = await serviceClient
      .from("pending_subscription_payments")
      .select("payment_id, organization_id")
      .eq("payment_id", String(payment_id))
      .eq("organization_id", org_id)
      .maybeSingle();
    if (!pending) {
      return new Response(JSON.stringify({ paid: false, status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, name, subscription_plan")
      .eq("id", org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ paid: false, status: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check payment status on Mercado Pago
    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      console.error("[check-subscription-pix] MP API error:", errBody);
      return new Response(JSON.stringify({ paid: false, status: "error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    const paid = mpData.status === "approved";

    console.log(`[check-subscription-pix] payment=${payment_id} status=${mpData.status}`);

    // If approved, activate the subscription
    if (paid) {
      // Read billing cycle and promo from payment metadata
      const billing = mpData.metadata?.billing || "monthly";
      const promoApplied = mpData.metadata?.promo_applied === true || mpData.metadata?.promo_applied === "true";
      const renewalDays = getRenewalDays(billing);

      const updateData: Record<string, unknown> = {
        subscription_plan: plan,
        subscription_status: "active",
        billing_cycle: billing,
        trial_ends_at: new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (promoApplied) updateData.used_first_month_promo = true;

      await serviceClient
        .from("organizations")
        .update(updateData)
        .eq("id", org_id);

      await serviceClient.from("activation_logs").insert({
        organization_id: org_id,
        org_name: org.name,
        old_plan: org.subscription_plan,
        new_plan: plan,
        old_status: null,
        new_status: "active",
        source: "mercadopago_pix",
        notes: `PIX payment ${payment_id} approved (${billing})${promoApplied ? " (promo 50% off)" : ""}`,
      });

      // Mark pending row as approved (idempotent)
      try {
        await serviceClient
          .from("pending_subscription_payments")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("payment_id", String(payment_id));
      } catch (_) { /* non-blocking */ }
    }

    return new Response(JSON.stringify({ paid, status: mpData.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[check-subscription-pix] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
