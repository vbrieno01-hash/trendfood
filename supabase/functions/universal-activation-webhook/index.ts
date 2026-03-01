import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** After activating an org, reward the referrer if applicable */
async function processReferralBonus(
  supabase: ReturnType<typeof createClient>,
  activatedOrgId: string,
) {
  try {
    const { data: activatedOrg } = await supabase
      .from("organizations")
      .select("referred_by_id, name")
      .eq("id", activatedOrgId)
      .single();

    if (!activatedOrg?.referred_by_id) return;

    const referrerId = activatedOrg.referred_by_id;

    // Check if bonus already granted
    const { data: existing } = await supabase
      .from("referral_bonuses")
      .select("id")
      .eq("referrer_org_id", referrerId)
      .eq("referred_org_id", activatedOrgId)
      .maybeSingle();

    if (existing) return;

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
      .select("trial_ends_at, name")
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

      console.log("[universal-webhook] Referral bonus: +10 days for org", referrerId);
    }
  } catch (err) {
    console.error("[universal-webhook] Referral bonus error (non-blocking):", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ── Read params from query string ──
    let orgId = url.searchParams.get("org_id");
    let email = url.searchParams.get("email");
    const daysParam = url.searchParams.get("days") || "30";
    const secretParam = url.searchParams.get("secret");
    const planParam = url.searchParams.get("plan") || "pro";

    // ── Also accept POST JSON body (gateway compat) ──
    let body: Record<string, any> | null = null;
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // body may not be JSON – ignore
      }
    }

    // Merge body values (query params take precedence)
    if (!orgId && body) {
      orgId = body.org_id ?? null;
    }
    if (!email && body) {
      email =
        body.email ??
        body.customer?.email ??
        body.buyer?.email ??
        null;
    }
    const days = parseInt(url.searchParams.has("days") ? daysParam : (body?.days ?? daysParam), 10);
    const plan = url.searchParams.has("plan") ? planParam : (body?.plan ?? planParam);
    const secret = secretParam ?? body?.secret ?? null;

    // ── Validate secret ──
    const expectedSecret = Deno.env.get("UNIVERSAL_WEBHOOK_SECRET");
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orgId && !email) {
      return new Response(JSON.stringify({ error: "org_id ou email é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Resolve orgId from email if needed ──
    if (!orgId && email) {
      const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
      if (usersErr) {
        return new Response(JSON.stringify({ error: "Erro ao buscar usuários" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = usersData.users.find(
        (u) => u.email?.toLowerCase() === email!.toLowerCase()
      );
      if (!user) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado para este email" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: org, error: orgErr } = await supabase
        .from("organizations")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (orgErr || !org) {
        return new Response(JSON.stringify({ error: "Loja não encontrada para este email" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      orgId = org.id;
    }

    // ── Fetch current org ──
    const { data: org, error: fetchErr } = await supabase
      .from("organizations")
      .select("id, name, subscription_plan, subscription_status, trial_ends_at")
      .eq("id", orgId!)
      .maybeSingle();

    if (fetchErr || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    // ── Update org ──
    const { error: updateErr } = await supabase
      .from("organizations")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        trial_ends_at: newTrialEnd.toISOString(),
      })
      .eq("id", orgId!);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to update organization" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Log activation ──
    await supabase.from("activation_logs").insert({
      organization_id: orgId!,
      org_name: org.name,
      old_plan: org.subscription_plan,
      new_plan: plan,
      old_status: org.subscription_status,
      new_status: "active",
      source: "webhook",
      notes: `+${days} dias via webhook${email ? ` (email: ${email})` : ""}`,
    });

    // ── Referral bonus ──
    await processReferralBonus(supabase, orgId!);

    return new Response(
      JSON.stringify({
        success: true,
        org_id: orgId,
        plan,
        trial_ends_at: newTrialEnd.toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
