import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Best-effort fire-and-forget call to admin telegram notifier */
async function notifyAdmin(
  supabase: ReturnType<typeof createClient>,
  eventType: string,
  payload: Record<string, unknown>,
) {
  try {
    await supabase.functions.invoke("admin-telegram-notify", {
      body: { event_type: eventType, payload },
    });
  } catch (err) {
    console.error("[mp-webhook] notifyAdmin error (non-blocking):", err);
  }
}

/** Compute estimated MRR (sum of active paid subs, normalized to monthly) */
async function computeMRR(supabase: ReturnType<typeof createClient>): Promise<number> {
  try {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("subscription_plan, billing_cycle, subscription_status")
      .eq("subscription_status", "active")
      .in("subscription_plan", ["pro", "enterprise"]);

    if (!orgs?.length) return 0;

    const { data: plans } = await supabase
      .from("platform_plans")
      .select("key, price_cents, quarterly_price_cents, annual_price_cents");

    const planMap = new Map<string, any>();
    (plans || []).forEach((p: any) => planMap.set(p.key, p));

    let totalCents = 0;
    for (const org of orgs as any[]) {
      const p = planMap.get(org.subscription_plan);
      if (!p) continue;
      if (org.billing_cycle === "annual" && p.annual_price_cents) {
        totalCents += Math.round(p.annual_price_cents / 12);
      } else if (org.billing_cycle === "quarterly" && p.quarterly_price_cents) {
        totalCents += Math.round(p.quarterly_price_cents / 3);
      } else {
        totalCents += p.price_cents || 0;
      }
    }
    return totalCents;
  } catch (err) {
    console.error("[mp-webhook] computeMRR error:", err);
    return 0;
  }
}

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
      .select("referred_by_id, name, billing_cycle")
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

    // Determine bonus days based on billing cycle
    const bonusDays = activatedOrg.billing_cycle === "annual" ? 30 : activatedOrg.billing_cycle === "quarterly" ? 15 : 10;

    // Insert bonus record
    await supabase.from("referral_bonuses").insert({
      referrer_org_id: referrerId,
      referred_org_id: activatedOrgId,
      bonus_days: bonusDays,
      referred_org_name: activatedOrg.name || null,
    });

    // Add bonus days to referrer's trial_ends_at
    const { data: referrerOrg } = await supabase
      .from("organizations")
      .select("trial_ends_at, mp_subscription_id, name")
      .eq("id", referrerId)
      .single();

    if (referrerOrg) {
      const currentExpiry = referrerOrg.trial_ends_at
        ? new Date(referrerOrg.trial_ends_at)
        : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + bonusDays * 24 * 60 * 60 * 1000);

      await supabase
        .from("organizations")
        .update({ trial_ends_at: newExpiry.toISOString() })
        .eq("id", referrerId);

      console.log(`[mp-webhook] Referral bonus: +${bonusDays} days for org`, referrerId);

      // Best-effort: postpone next MP billing by bonus days
      if (referrerOrg.mp_subscription_id) {
        try {
          const mpRes = await fetch(
            `https://api.mercadopago.com/preapproval/${referrerOrg.mp_subscription_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          const sub = await mpRes.json();
          if (mpRes.ok && sub.next_payment_date) {
            const nextPayment = new Date(sub.next_payment_date);
            nextPayment.setDate(nextPayment.getDate() + bonusDays);
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
            console.log(`[mp-webhook] MP next_payment_date postponed +${bonusDays} days for`, referrerId);
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
        notes: `+${bonusDays} dias por indicar "${activatedOrg.name}" (org ${activatedOrgId})`,
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
        .select("subscription_plan, subscription_status, name, billing_cycle")
        .eq("id", orgId)
        .single();

      let plan = "pro";
      if (sub.auto_recurring?.transaction_amount >= 200) plan = "enterprise";
      if (sub.reason?.toLowerCase().includes("enterprise")) plan = "enterprise";

      const renewalDays = org?.billing_cycle === "annual" ? 370 : org?.billing_cycle === "quarterly" ? 95 : 35;

      if (sub.status === "authorized") {
        const trialEnds = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString();
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
        // Notify admin about rejected/failed payment
        if (mpData.status === "rejected" || mpData.status === "cancelled") {
          let failOrgId: string | null = mpData.metadata?.org_id || null;
          let failPlan: string | null = mpData.metadata?.plan || null;
          let failCycle: string | null = null;
          if (!failOrgId && mpData.metadata?.preapproval_id) {
            const { data: o } = await supabase
              .from("organizations")
              .select("id, name, subscription_plan, billing_cycle")
              .eq("mp_subscription_id", mpData.metadata.preapproval_id)
              .maybeSingle();
            if (o) {
              failOrgId = (o as any).id;
              failPlan = (o as any).subscription_plan;
              failCycle = (o as any).billing_cycle;
            }
          }
          if (failOrgId) {
            const { data: orgInfo } = await supabase
              .from("organizations")
              .select("name, slug, whatsapp, subscription_plan, billing_cycle")
              .eq("id", failOrgId)
              .maybeSingle();
            await notifyAdmin(supabase, "payment_failed", {
              org_id: failOrgId,
              org_name: (orgInfo as any)?.name || null,
              slug: (orgInfo as any)?.slug || null,
              whatsapp: (orgInfo as any)?.whatsapp || null,
              plan: failPlan || (orgInfo as any)?.subscription_plan || null,
              billing_cycle: failCycle || (orgInfo as any)?.billing_cycle || null,
              reason: mpData.status_detail || mpData.status,
            });
          }
        }
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
          const { data: org } = await supabase
            .from("organizations")
            .select("subscription_plan, subscription_status, name, billing_cycle, used_first_month_promo")
            .eq("id", orgId)
            .single();

          const renewalDays = org?.billing_cycle === "annual" ? 370 : org?.billing_cycle === "quarterly" ? 95 : 35;
          const trialEnds = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString();

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

          // ── Notify admin about confirmed payment ──
          {
            const mrr = await computeMRR(supabase);
            await notifyAdmin(supabase, "payment_confirmed", {
              org_id: orgId,
              org_name: org?.name || null,
              slug: (org as any)?.slug || null,
              whatsapp: (org as any)?.whatsapp || null,
              plan: org?.subscription_plan || null,
              billing_cycle: org?.billing_cycle || null,
              amount: mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
              payment_method: mpData.payment_method_id || "MP",
              mrr_estimate: mrr,
            });
          }

          // ── Promo: bump subscription to full price after first half-price payment ──
          if (org?.used_first_month_promo && preapprovalId) {
            try {
              // Fetch plan to get full price
              const { data: planRow } = await supabase
                .from("platform_plans")
                .select("price_cents, key")
                .eq("key", org.subscription_plan)
                .eq("active", true)
                .single();

              if (planRow) {
                const fullAmount = planRow.price_cents / 100;
                const paidAmount = mpData.transaction_amount || mpData.transaction_details?.total_paid_amount;
                const halfAmount = Math.round(planRow.price_cents / 2) / 100;

                // Only bump if paid amount matches half price (first promo payment)
                if (paidAmount && Math.abs(paidAmount - halfAmount) < 1) {
                  console.log(`[mp-webhook] Promo detected: paid ${paidAmount}, bumping to ${fullAmount}`);
                  await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                    method: "PUT",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      auto_recurring: {
                        transaction_amount: fullAmount,
                      },
                    }),
                  });
                  console.log("[mp-webhook] Subscription bumped to full price:", fullAmount);
                }
              }
            } catch (promoErr) {
              console.error("[mp-webhook] Promo bump error (non-blocking):", promoErr);
            }
          }

          // ── Referral bonus (first payment) ──
          await processReferralBonus(supabase, orgId, accessToken);

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Legacy one-time payment flow (PIX or card via create-mp-payment)
      const orgId = mpData.metadata?.org_id;
      const plan = mpData.metadata?.plan;
      const promoApplied = mpData.metadata?.promo_applied === true || mpData.metadata?.promo_applied === "true";

      if (!orgId || !plan) {
        console.log("[mp-webhook] Payment approved but no org_id/plan metadata — possibly external");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan, subscription_status, name, billing_cycle")
        .eq("id", orgId)
        .single();

      const legacyDays = org?.billing_cycle === "annual" ? 370 : org?.billing_cycle === "quarterly" ? 95 : 30;
      const trialEnds = new Date(Date.now() + legacyDays * 24 * 60 * 60 * 1000).toISOString();

      const updateData: Record<string, unknown> = {
        subscription_plan: plan,
        subscription_status: "active",
        trial_ends_at: trialEnds,
      };
      if (promoApplied) updateData.used_first_month_promo = true;

      await supabase
        .from("organizations")
        .update(updateData)
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

      // ── Notify admin about confirmed payment (legacy one-time / first PIX) ──
      {
        const mrr = await computeMRR(supabase);
        await notifyAdmin(supabase, "payment_confirmed", {
          org_id: orgId,
          org_name: org?.name || null,
          slug: (org as any)?.slug || null,
          whatsapp: (org as any)?.whatsapp || null,
          plan: plan,
          billing_cycle: org?.billing_cycle || null,
          amount: mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
          payment_method: mpData.payment_method_id || "MP",
          mrr_estimate: mrr,
        });
      }

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
