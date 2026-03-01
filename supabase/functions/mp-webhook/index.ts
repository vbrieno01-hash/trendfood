import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** After activating an org, reward the referrer if applicable */
async function processReferralBonus(
  supabase: ReturnType<typeof createClient>,
  activatedOrgId: string,
  accessToken: string,
) {
  try {
    // Get the activated org's referred_by_id
    const { data: activatedOrg } = await supabase
      .from("organizations")
      .select("referred_by_id, name")
      .eq("id", activatedOrgId)
      .single();

    if (!activatedOrg?.referred_by_id) return;

    const referrerId = activatedOrg.referred_by_id;

    // Check if bonus already granted for this pair
    const { data: existing } = await supabase
      .from("referral_bonuses")
      .select("id")
      .eq("referrer_org_id", referrerId)
      .eq("referred_org_id", activatedOrgId)
      .maybeSingle();

    if (existing) {
      console.log("[mp-webhook] Referral bonus already granted for pair", referrerId, activatedOrgId);
      return;
    }

    // Insert bonus record
    await supabase.from("referral_bonuses").insert({
      referrer_org_id: referrerId,
      referred_org_id: activatedOrgId,
      bonus_days: 10,
      referred_org_name: activatedOrg.name || null,
    });

    // Add +10 days to referrer's trial_ends_at
    const { data: referrerOrg } = await supabase
      .from("organizations")
      .select("trial_ends_at, mp_subscription_id, name")
      .eq("id", referrerId)
      .single();

    if (referrerOrg) {
      const currentExpiry = referrerOrg.trial_ends_at
        ? new Date(referrerOrg.trial_ends_at)
        : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + 10 * 24 * 60 * 60 * 1000);

      await supabase
        .from("organizations")
        .update({ trial_ends_at: newExpiry.toISOString() })
        .eq("id", referrerId);

      console.log("[mp-webhook] Referral bonus: +10 days for org", referrerId);

      // Best-effort: postpone next MP billing by 10 days
      if (referrerOrg.mp_subscription_id) {
        try {
          const mpRes = await fetch(
            `https://api.mercadopago.com/preapproval/${referrerOrg.mp_subscription_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          const sub = await mpRes.json();
          if (mpRes.ok && sub.next_payment_date) {
            const nextPayment = new Date(sub.next_payment_date);
            nextPayment.setDate(nextPayment.getDate() + 10);
            await fetch(
              `https://api.mercadopago.com/preapproval/${referrerOrg.mp_subscription_id}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  next_payment_date: nextPayment.toISOString(),
                }),
              },
            );
            console.log("[mp-webhook] MP next_payment_date postponed +10 days for", referrerId);
          }
        } catch (mpErr) {
          console.error("[mp-webhook] Failed to postpone MP billing (non-blocking):", mpErr);
        }
      }

      await supabase.from("activation_logs").insert({
        organization_id: referrerId,
        org_name: referrerOrg.name || null,
        old_plan: null,
        new_plan: null,
        old_status: null,
        new_status: null,
        source: "referral_bonus",
        notes: `+10 dias por indicar "${activatedOrg.name}" (org ${activatedOrgId})`,
      });
    }
  } catch (err) {
    console.error("[mp-webhook] Referral bonus error (non-blocking):", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[mp-webhook] Received:", JSON.stringify(body));

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Handle subscription_preapproval notifications ──
    if (body.type === "subscription_preapproval") {
      const preapprovalId = body.data?.id;
      if (!preapprovalId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const sub = await mpRes.json();

      if (!mpRes.ok) {
        console.error("[mp-webhook] Failed to fetch preapproval:", JSON.stringify(sub));
        return new Response(JSON.stringify({ error: "Failed to fetch preapproval" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("[mp-webhook] Preapproval status:", sub.status, "external_reference:", sub.external_reference, "reason:", sub.reason);

      const orgId = sub.external_reference;
      if (!orgId) {
        console.error("[mp-webhook] No external_reference in preapproval");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan, subscription_status, name")
        .eq("id", orgId)
        .single();

      let plan = "pro";
      if (sub.auto_recurring?.transaction_amount >= 200) plan = "enterprise";
      if (sub.reason?.toLowerCase().includes("enterprise")) plan = "enterprise";

      if (sub.status === "authorized") {
        const trialEnds = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("organizations")
          .update({
            subscription_plan: plan,
            subscription_status: "active",
            trial_ends_at: trialEnds,
            mp_subscription_id: preapprovalId,
          })
          .eq("id", orgId);

        await supabase.from("activation_logs").insert({
          organization_id: orgId,
          org_name: org?.name || null,
          old_plan: org?.subscription_plan || null,
          new_plan: plan,
          old_status: org?.subscription_status || null,
          new_status: "active",
          source: "mp_subscription",
          notes: `Subscription ${preapprovalId} authorized`,
        });

        console.log("[mp-webhook] Org activated:", orgId, "plan:", plan);

        // ── Referral bonus ──
        await processReferralBonus(supabase, orgId, accessToken);
      } else if (sub.status === "cancelled" || sub.status === "paused") {
        await supabase
          .from("organizations")
          .update({
            subscription_plan: "free",
            subscription_status: sub.status,
            mp_subscription_id: null,
          })
          .eq("id", orgId);

        await supabase.from("activation_logs").insert({
          organization_id: orgId,
          org_name: org?.name || null,
          old_plan: org?.subscription_plan || null,
          new_plan: "free",
          old_status: org?.subscription_status || null,
          new_status: sub.status,
          source: "mp_subscription",
          notes: `Subscription ${preapprovalId} ${sub.status}`,
        });

        console.log("[mp-webhook] Org deactivated:", orgId, "status:", sub.status);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Handle payment notifications ──
    if (body.type === "payment" || body.action === "payment.updated") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response(JSON.stringify({ error: "No payment ID" }), {
          status: 400,
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

      // Recurring subscription payment
      if (mpData.point_of_interaction?.type === "SUBSCRIPTIONS" || mpData.metadata?.preapproval_id) {
        const preapprovalId = mpData.metadata?.preapproval_id;
        let orgId: string | null = null;

        if (preapprovalId) {
          const { data: orgBySubId } = await supabase
            .from("organizations")
            .select("id, subscription_plan, subscription_status, name")
            .eq("mp_subscription_id", preapprovalId)
            .single();
          if (orgBySubId) orgId = orgBySubId.id;
        }

        if (!orgId && mpData.external_reference) {
          orgId = mpData.external_reference;
        }

        if (orgId) {
          const trialEnds = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString();
          const { data: org } = await supabase
            .from("organizations")
            .select("subscription_plan, subscription_status, name")
            .eq("id", orgId)
            .single();

          await supabase
            .from("organizations")
            .update({ trial_ends_at: trialEnds, subscription_status: "active" })
            .eq("id", orgId);

          await supabase.from("activation_logs").insert({
            organization_id: orgId,
            org_name: org?.name || null,
            old_plan: org?.subscription_plan || null,
            new_plan: org?.subscription_plan || null,
            old_status: org?.subscription_status || null,
            new_status: "active",
            source: "mp_subscription_payment",
            notes: `Recurring payment ${paymentId} approved — renewed +35 days`,
          });

          console.log("[mp-webhook] Recurring payment renewed org:", orgId);

          // ── Referral bonus (first payment) ──
          await processReferralBonus(supabase, orgId, accessToken);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Legacy one-time payment flow
      const orgId = mpData.metadata?.org_id;
      const plan = mpData.metadata?.plan;

      if (!orgId || !plan) {
        console.log("[mp-webhook] Payment approved but no org_id/plan metadata — possibly external");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan, subscription_status, name")
        .eq("id", orgId)
        .single();

      const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("organizations")
        .update({
          subscription_plan: plan,
          subscription_status: "active",
          trial_ends_at: trialEnds,
        })
        .eq("id", orgId);

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

      // ── Referral bonus ──
      await processReferralBonus(supabase, orgId, accessToken);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
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
