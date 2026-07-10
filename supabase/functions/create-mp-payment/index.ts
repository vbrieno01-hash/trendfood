import { createClient } from "npm:@supabase/supabase-js@2";

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

function getPriceCents(planRow: Record<string, unknown>, billing: string): number {
  if (billing === "quarterly" && planRow.quarterly_price_cents) return planRow.quarterly_price_cents as number;
  if (billing === "annual" && planRow.annual_price_cents) return planRow.annual_price_cents as number;
  return planRow.price_cents as number;
}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: userError } = await supabase.auth.getClaims(token);
    if (userError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const { org_id, plan, cpf_cnpj, payment_method, card_token, billing = "monthly", promo = false } = await req.json();

    if (!org_id || !plan || !cpf_cnpj || !payment_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate org ownership and get promo eligibility
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, user_id, used_first_month_promo")
      .eq("id", org_id)
      .single();

    if (orgError || !org || org.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Organization not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan price from database
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: planRow, error: planError } = await serviceClient
      .from("platform_plans")
      .select("name, price_cents, quarterly_price_cents, annual_price_cents")
      .eq("key", plan)
      .eq("active", true)
      .single();

    if (planError || !planRow) {
      console.error("[create-mp-payment] Plan not found:", plan, planError);
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the correct price based on billing cycle
    const baseCents = getPriceCents(planRow, billing);

    if (baseCents === 0) {
      return new Response(JSON.stringify({ error: "Cannot create payment for a free plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply promo: half price for first month if eligible (only monthly)
    const promoApplied = promo && billing === "monthly" && !org.used_first_month_promo && baseCents > 0;
    const finalCents = promoApplied ? Math.round(baseCents / 2) : baseCents;
    const amount = finalCents / 100;
    const renewalDays = getRenewalDays(billing);

    console.log(`[create-mp-payment] billing=${billing} promoRequested=${promo} promoApplied=${promoApplied} base=${baseCents} final=${finalCents} renewalDays=${renewalDays}`);

    const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DEDUP: se já existe um PIX pending recente pra essa org+plano, reaproveita
    // Evita múltiplos QRs simultâneos que causam "Pix já foi feito" no banco do cliente.
    if (payment_method === "pix") {
      try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: recentPending } = await serviceClient
          .from("pending_subscription_payments")
          .select("payment_id, created_at")
          .eq("organization_id", org_id)
          .eq("plan", plan)
          .eq("status", "pending")
          .gte("created_at", tenMinAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentPending?.payment_id) {
          const chkRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${recentPending.payment_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (chkRes.ok) {
            const chkData = await chkRes.json();
            if (chkData.status === "pending") {
              const qr = chkData.point_of_interaction?.transaction_data;
              if (qr?.qr_code) {
                return new Response(
                  JSON.stringify({
                    status: chkData.status,
                    status_detail: chkData.status_detail || null,
                    payment_id: chkData.id,
                    pix_qr_code: qr.qr_code,
                    pix_qr_code_base64: qr.qr_code_base64 || null,
                    pix_expiration: chkData.date_of_expiration || null,
                    reused: true,
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } },
                );
              }
            } else if (
              chkData.status === "rejected" ||
              chkData.status === "cancelled" ||
              chkData.status === "expired"
            ) {
              await serviceClient
                .from("pending_subscription_payments")
                .update({ status: "failed", resolved_at: new Date().toISOString() })
                .eq("payment_id", String(recentPending.payment_id));
            }
          }
        }
      } catch (e) {
        console.error("[create-mp-payment] dedup lookup (non-blocking):", e);
      }
    }

    // Build MP payment body
    const cleanDoc = cpf_cnpj.replace(/\D/g, "");
    const docType = cleanDoc.length <= 11 ? "CPF" : "CNPJ";

    const paymentBody: Record<string, unknown> = {
      transaction_amount: amount,
      description: `Assinatura ${planRow.name} - ${org.name}`,
      payment_method_id: payment_method === "pix" ? "pix" : undefined,
      payer: {
        email: userEmail,
        identification: { type: docType, number: cleanDoc },
      },
      metadata: {
        org_id,
        plan,
        user_id: userId,
        billing,
        promo_applied: promoApplied,
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
        old_plan: null,
        new_plan: plan,
        old_status: null,
        new_status: "active",
        source: "mercadopago",
        notes: `Payment ${mpData.id} approved (card, ${billing})`,
      });
    }

    // Build response
    const result: Record<string, unknown> = {
      status: mpData.status,
      status_detail: mpData.status_detail || null,
      payment_id: mpData.id,
    };

    console.log(`[create-mp-payment] plan=${plan} billing=${billing} amount=${amount} status=${mpData.status} detail=${mpData.status_detail}`);

    if (payment_method === "pix" && mpData.point_of_interaction?.transaction_data) {
      result.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      result.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      result.pix_expiration = mpData.date_of_expiration;

      // Persist pending PIX so the reconcile cron can activate the plan
      // even if the user closes the browser before the front-end polling detects approval.
      try {
        await serviceClient.from("pending_subscription_payments").insert({
          organization_id: org_id,
          payment_id: String(mpData.id),
          plan,
          billing_cycle: billing,
          promo_applied: promoApplied,
          amount_cents: finalCents,
          status: "pending",
        });
      } catch (persistErr) {
        console.error("[create-mp-payment] Failed to persist pending PIX (non-blocking):", persistErr);
      }
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
