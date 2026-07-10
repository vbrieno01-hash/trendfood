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
  paymentId?: string | number | null,
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
    // Mensal = +1 mês (30d) · Trimestral = +1.5 mês (45d) · Anual = +3 meses (90d)
    const bonusDays = activatedOrg.billing_cycle === "annual" ? 90 : activatedOrg.billing_cycle === "quarterly" ? 45 : 30;

    // Registra o bônus em carência. O trigger valida anti-fraude
    // e a função release_pending_referral_bonuses (pg_cron horário)
    // credita os dias após 7 dias sem refund.
    const { error: insErr } = await supabase.from("referral_bonuses").insert({
      referrer_org_id: referrerId,
      referred_org_id: activatedOrgId,
      bonus_days: bonusDays,
      referred_org_name: activatedOrg.name || null,
      source_payment_id: paymentId ? String(paymentId) : null,
    });

    if (insErr) {
      console.warn("[mp-webhook] referral_bonus insert blocked:", insErr.message);
      // Registra tentativa bloqueada e notifica admin no Telegram
      const reason = insErr.message?.match(/Auto-indica|mesmo dono|mesmo CNPJ|mesmo WhatsApp/i)?.[0]
        || "trigger_blocked";
      try {
        await supabase.from("referral_block_logs").insert({
          referrer_org_id: referrerId,
          referred_org_id: activatedOrgId,
          reason,
          source_payment_id: paymentId ? String(paymentId) : null,
          raw_error: insErr.message,
        });
        await notifyAdmin(supabase, "referral_blocked", {
          referrer_org_id: referrerId,
          referred_org_id: activatedOrgId,
          referred_org_name: activatedOrg.name || null,
          reason,
          payment_id: paymentId ? String(paymentId) : null,
        });
      } catch (e) {
        console.error("[mp-webhook] block log err:", e);
      }
      return;
    }

    const { data: referrerOrg } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", referrerId)
      .maybeSingle();

    await supabase.from("activation_logs").insert({
      organization_id: referrerId,
      org_name: referrerOrg?.name || null,
      old_plan: null,
      new_plan: null,
      old_status: null,
      new_status: null,
      source: "referral_bonus",
      notes: `+${bonusDays} dias em carência (libera em 7d) por indicar "${activatedOrg.name}" (org ${activatedOrgId})`,
    });

    console.log(`[mp-webhook] Referral bonus queued: +${bonusDays}d for`, referrerId);
  } catch (err) {
    console.error("[mp-webhook] Referral bonus error (non-blocking):", err);
  }
}

/** Reverte bônus de indicação quando o pagamento de origem é estornado */
async function processReferralRefund(
  supabase: ReturnType<typeof createClient>,
  paymentId: string | number,
) {
  try {
    const pidStr = String(paymentId);
    const { data, error } = await supabase.rpc("revert_referral_bonus_by_payment", {
      _payment_id: pidStr,
    });
    if (error) {
      console.error("[mp-webhook] revert referral bonus err:", error);
      return;
    }
    if (data && Number(data) > 0) {
      console.log(`[mp-webhook] reverted ${data} referral bonus(es) for payment`, pidStr);
    }
  } catch (err) {
    console.error("[mp-webhook] processReferralRefund error (non-blocking):", err);
  }
}

/** Cria comissão de afiliado quando pagamento é aprovado (status=pending, libera em 7 dias) */
async function processAffiliateCommission(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  paymentId: string | number | null | undefined,
  amountPaid: number | null | undefined,
  billingCycle: string | null | undefined,
) {
  try {
    if (!amountPaid || amountPaid <= 0) return;
    const { data: org } = await supabase
      .from("organizations")
      .select("affiliate_id, subscription_plan")
      .eq("id", orgId)
      .maybeSingle();
    const affiliateId = (org as any)?.affiliate_id;
    if (!affiliateId) return;

    const { data: aff } = await supabase
      .from("affiliates")
      .select("id, commission_pct, active, telegram_chat_id, name")
      .eq("id", affiliateId)
      .maybeSingle();
    if (!aff || !(aff as any).active) return;

    const pidStr = paymentId ? String(paymentId) : null;

    // Idempotência: se já existe goal pra esse payment_id, não duplica
    if (pidStr) {
      const { data: existingGoal } = await supabase
        .from("affiliate_client_goals")
        .select("id")
        .eq("source_payment_id", pidStr)
        .eq("affiliate_id", affiliateId)
        .maybeSingle();
      if (existingGoal) {
        console.log("[mp-webhook] goal já existe para payment", pidStr);
        return;
      }
    }

    const amountCents = Math.round(Number(amountPaid) * 100);

    // Busca tier (plan_key + cycle) — apenas pro/enterprise estão na tabela V8
    const subPlan = (org as any)?.subscription_plan;
    const planKey = subPlan === "enterprise" ? "enterprise" : "pro";
    const cycleKey = billingCycle || "monthly";

    const { data: tier } = await supabase
      .from("affiliate_commission_tiers")
      .select("upfront_pct, installment_pct, label")
      .eq("plan_key", planKey)
      .eq("cycle", cycleKey)
      .eq("active", true)
      .maybeSingle();

    if (!tier) {
      console.warn("[mp-webhook] sem tier para", planKey, cycleKey);
      return;
    }

    const upfrontCents = Math.round(amountCents * Number((tier as any).upfront_pct) / 100);
    const monthlyCents = Math.round(amountCents * Number((tier as any).installment_pct) / 100);
    const threeXTotal = monthlyCents * 3;

    const { data: goal, error: gErr } = await supabase
      .from("affiliate_client_goals")
      .insert({
        affiliate_id: affiliateId,
        client_org_id: orgId,
        source_payment_id: pidStr,
        plan_key: planKey,
        cycle: cycleKey,
        client_amount_cents: amountCents,
        tier_upfront_pct: (tier as any).upfront_pct,
        tier_installment_pct: (tier as any).installment_pct,
        mode: "pending_choice",
        total_commission_cents: 0,
        status: "awaiting_choice",
      })
      .select("id")
      .single();

    if (gErr) {
      console.error("[mp-webhook] insert goal err:", gErr);
      return;
    }

    // Envia Telegram com botões inline (se afiliado tem chat_id)
    if ((aff as any).telegram_chat_id) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
        if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
          const { data: orgInfo } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
          const orgName = (orgInfo as any)?.name || "—";
          const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const text = `🎉 <b>Nova loja: ${orgName}</b>\n\n` +
            `📦 Plano: <b>${(tier as any).label}</b>\n` +
            `💵 Valor: ${fmt(amountCents)}\n\n` +
            `Como quer receber sua comissão?\n\n` +
            `💰 <b>À Vista</b>: ${fmt(upfrontCents)} (libera em 7 dias)\n` +
            `📅 <b>3x mensal</b>: ${fmt(monthlyCents)}/mês = ${fmt(threeXTotal)}\n\n` +
            `⏰ Você tem 48h. Sem escolha = À Vista.`;
          await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: (aff as any).telegram_chat_id,
              text,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [[
                  { text: `💰 À Vista (${fmt(upfrontCents)})`, callback_data: `aff:choice:${(goal as any).id}:upfront` },
                  { text: `📅 3x (${fmt(monthlyCents)}/mês)`, callback_data: `aff:choice:${(goal as any).id}:3x` },
                ]],
              },
            }),
          });
        }
      } catch (e) {
        console.error("[mp-webhook] telegram goal prompt err:", e);
      }
    }
  } catch (err) {
    console.error("[mp-webhook] processAffiliateCommission error (non-blocking):", err);
  }
}

/** Registra pagamento real no ledger subscription_payments (idempotente por payment_id) */
async function recordSubscriptionPayment(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  paymentId: string | number | null | undefined,
  amountPaid: number | null | undefined,
  plan: string | null | undefined,
  billingCycle: string | null | undefined,
  promoApplied: boolean,
  source: string,
) {
  try {
    if (!amountPaid || amountPaid <= 0 || !plan) return;
    const amountCents = Math.round(Number(amountPaid) * 100);
    const pidStr = paymentId ? String(paymentId) : null;
    const { error } = await supabase
      .from("subscription_payments")
      .insert({
        organization_id: orgId,
        payment_id: pidStr,
        plan,
        billing_cycle: billingCycle || null,
        amount_cents: amountCents,
        promo_applied: promoApplied,
        source,
      });
    if (error && !String(error.message || "").includes("duplicate")) {
      console.error("[mp-webhook] subscription_payments insert err:", error);
    }
  } catch (e) {
    console.error("[mp-webhook] recordSubscriptionPayment error (non-blocking):", e);
  }
}

/** Marca comissões como refunded quando MP estorna o pagamento */
async function processAffiliateRefund(
  supabase: ReturnType<typeof createClient>,
  paymentId: string | number,
) {
  try {
    const pidStr = String(paymentId);
    const { data: rows } = await supabase
      .from("affiliate_commissions")
      .select("id, affiliate_id, status")
      .eq("payment_id", pidStr);
    if (!rows?.length) return;
    for (const row of rows as any[]) {
      if (row.status === "refunded") continue;
      await supabase
        .from("affiliate_commissions")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("id", row.id);
      try {
        await supabase.functions.invoke("notify-affiliate-telegram", {
          body: { event_type: "refunded", affiliate_id: row.affiliate_id, commission_id: row.id },
        });
      } catch (e) {
        console.error("[mp-webhook] notify refund err:", e);
      }
    }
  } catch (err) {
    console.error("[mp-webhook] processAffiliateRefund error:", err);
  }
}

/** ── ADDON HANDLER ──
 * Extends org_addons.current_period_end by 30 days on approved payment.
 * Called for both preapproval `authorized` events and recurring/PIX payments
 * whose external_reference matches `addon:ai_bot:<org_id>`.
 */
async function extendAiBotAddon(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  preapprovalId: string | null,
  paymentId: string | number | null,
  source: string,
) {
  try {
    const { data: existing } = await supabase
      .from("org_addons")
      .select("id, current_period_end, mp_preapproval_id, price_monthly, billing_day")
      .eq("organization_id", orgId)
      .eq("addon_key", "ai_bot")
      .maybeSingle();

    const now = new Date();
    const base =
      existing && (existing as any).current_period_end && new Date((existing as any).current_period_end) > now
        ? new Date((existing as any).current_period_end)
        : now;
    const nextEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (existing) {
      await supabase
        .from("org_addons")
        .update({
          status: "active",
          current_period_end: nextEnd,
          mp_preapproval_id: (existing as any).mp_preapproval_id || preapprovalId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", (existing as any).id);
    } else {
      await supabase.from("org_addons").insert({
        organization_id: orgId,
        addon_key: "ai_bot",
        status: "active",
        price_monthly: 50,
        billing_day: 4,
        current_period_end: nextEnd,
        mp_preapproval_id: preapprovalId,
      });
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();

    await supabase.from("activation_logs").insert({
      organization_id: orgId,
      org_name: (org as any)?.name || null,
      old_plan: null,
      new_plan: null,
      old_status: null,
      new_status: "active",
      source: "mercadopago-addon",
      notes: `Addon ai_bot renewed (+30d until ${nextEnd.slice(0, 10)}) via ${source}${paymentId ? ` payment ${paymentId}` : ""}${preapprovalId ? ` preapproval ${preapprovalId}` : ""}`,
    });

    // Mark pending PIX row as resolved (idempotent)
    if (paymentId) {
      try {
        await supabase
          .from("pending_subscription_payments")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("payment_id", String(paymentId));
      } catch { /* non-blocking */ }
    }

    console.log(`[mp-webhook][addon] extended ai_bot for org ${orgId} until ${nextEnd}`);
  } catch (err) {
    console.error("[mp-webhook][addon] extendAiBotAddon error:", err);
  }
}

function parseAddonRef(ref: string | null | undefined): { orgId: string; key: string } | null {
  if (!ref) return null;
  const m = /^addon:([a-z_0-9]+):([0-9a-f-]{36})$/i.exec(ref);
  if (!m) return null;
  return { key: m[1], orgId: m[2] };
}

/** ── CAMPAIGN CREDITS HANDLER ──
 * Avulso: cada pagamento aprovado adiciona N msgs + N dias via RPC atômico.
 */
async function applyCampaignCreditsPurchase(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  paymentId: string | number | null,
  credits: number,
  days: number,
) {
  try {
    const { error } = await supabase.rpc("apply_campaign_credits_purchase", {
      _org_id: orgId,
      _credits: credits,
      _days: days,
      _payment_id: paymentId ? String(paymentId) : null,
    });
    if (error) {
      console.error("[mp-webhook][campaign] rpc err:", error);
      return;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle();

    await supabase.from("activation_logs").insert({
      organization_id: orgId,
      org_name: (org as any)?.name || null,
      old_plan: null,
      new_plan: null,
      old_status: null,
      new_status: "active",
      source: "mercadopago-campaign-addon",
      notes: `Campanhas WhatsApp: +${credits} msgs / +${days}d${paymentId ? ` (payment ${paymentId})` : ""}`,
    });

    if (paymentId) {
      try {
        await supabase
          .from("pending_subscription_payments")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("payment_id", String(paymentId));
      } catch { /* non-blocking */ }
    }

    console.log(`[mp-webhook][campaign] +${credits} msgs / +${days}d applied to org ${orgId}`);
  } catch (err) {
    console.error("[mp-webhook][campaign] error:", err);
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

      // ── ADDON short-circuit ──
      const addonRef = parseAddonRef(sub.external_reference);
      if (addonRef && addonRef.key === "ai_bot") {
        if (sub.status === "authorized") {
          // "authorized" event only ties the preapproval; each real charge extends via payment event.
          const admin = supabase;
          const { data: existing } = await admin
            .from("org_addons")
            .select("id, mp_preapproval_id")
            .eq("organization_id", addonRef.orgId)
            .eq("addon_key", "ai_bot")
            .maybeSingle();
          if (existing && !(existing as any).mp_preapproval_id) {
            await admin
              .from("org_addons")
              .update({ mp_preapproval_id: preapprovalId, updated_at: new Date().toISOString() })
              .eq("id", (existing as any).id);
          }
          console.log("[mp-webhook][addon] preapproval authorized for", addonRef.orgId);
        } else if (sub.status === "cancelled" || sub.status === "paused") {
          await supabase
            .from("org_addons")
            .update({ status: "cancelled", updated_at: new Date().toISOString() })
            .eq("organization_id", addonRef.orgId)
            .eq("addon_key", "ai_bot");
          console.log("[mp-webhook][addon] preapproval cancelled/paused for", addonRef.orgId);
        }
        return new Response(JSON.stringify({ success: true, addon: "ai_bot" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const orgId = sub.external_reference;
      if (!orgId) {
        console.error("[mp-webhook] No external_reference in preapproval");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan, subscription_status, name, slug, whatsapp, billing_cycle")
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
        // Reembolso/estorno: cancela comissão do afiliado e reverte bônus de indicação
        if (mpData.status === "refunded" || mpData.status === "charged_back" || mpData.status === "cancelled") {
          await processAffiliateRefund(supabase, paymentId);
          await processReferralRefund(supabase, paymentId);
        }
        return new Response(JSON.stringify({ received: true, status: mpData.status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── ADDON short-circuit (approved payments) ──
      {
        const addonRefPayment =
          parseAddonRef(mpData.external_reference) ||
          (mpData.metadata?.addon_key === "ai_bot" && mpData.metadata?.org_id
            ? { key: "ai_bot", orgId: String(mpData.metadata.org_id) }
            : null);

        let addonRefFromPreapproval: { orgId: string; key: string } | null = null;
        if (!addonRefPayment && mpData.metadata?.preapproval_id) {
          try {
            const pRes = await fetch(
              `https://api.mercadopago.com/preapproval/${mpData.metadata.preapproval_id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const pJson = await pRes.json();
            if (pRes.ok) {
              addonRefFromPreapproval = parseAddonRef(pJson.external_reference);
            }
          } catch (e) {
            console.error("[mp-webhook][addon] preapproval lookup err:", e);
          }
        }

        const addonRef = addonRefPayment || addonRefFromPreapproval;
        if (addonRef && addonRef.key === "campaign_250") {
          const credits = Number(mpData.metadata?.credits) || 250;
          await applyCampaignCreditsPurchase(
            supabase,
            addonRef.orgId,
            paymentId,
            credits,
            30,
          );
          return new Response(JSON.stringify({ success: true, addon: "campaign_250" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (addonRef && addonRef.key === "ai_bot") {
          await extendAiBotAddon(
            supabase,
            addonRef.orgId,
            mpData.metadata?.preapproval_id || null,
            paymentId,
            addonRefPayment ? "payment" : "recurring",
          );
          return new Response(JSON.stringify({ success: true, addon: "ai_bot" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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
          await processReferralBonus(supabase, orgId, accessToken, paymentId);

          // ── Comissão de afiliado externo (recorrente) ──
          await processAffiliateCommission(
            supabase,
            orgId,
            paymentId,
            mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
            org?.billing_cycle || null,
          );

          // ── Ledger de receita real ──
          await recordSubscriptionPayment(
            supabase,
            orgId,
            paymentId,
            mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
            org?.subscription_plan || null,
            org?.billing_cycle || null,
            !!org?.used_first_month_promo,
            "mp_webhook",
          );

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
        .select("subscription_plan, subscription_status, name, slug, whatsapp, billing_cycle")
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

      // Mark pending PIX row as approved (idempotent)
      try {
        await supabase
          .from("pending_subscription_payments")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("payment_id", String(paymentId));
      } catch (_) { /* non-blocking */ }

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
      await processReferralBonus(supabase, orgId, accessToken, paymentId);

      // ── Comissão de afiliado externo ──
      await processAffiliateCommission(
        supabase,
        orgId,
        paymentId,
        mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
        org?.billing_cycle || null,
      );

      // ── Ledger de receita real ──
      await recordSubscriptionPayment(
        supabase,
        orgId,
        paymentId,
        mpData.transaction_amount || mpData.transaction_details?.total_paid_amount || null,
        plan,
        org?.billing_cycle || null,
        promoApplied,
        "mp_webhook",
      );

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
