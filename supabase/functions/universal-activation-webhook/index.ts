import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
