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
    const orgId = url.searchParams.get("org_id");
    const days = parseInt(url.searchParams.get("days") || "30", 10);
    const secret = url.searchParams.get("secret");
    const plan = url.searchParams.get("plan") || "pro";

    const expectedSecret = Deno.env.get("UNIVERSAL_WEBHOOK_SECRET");
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orgId) {
      return new Response(JSON.stringify({ error: "org_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch current org
    const { data: org, error: fetchErr } = await supabase
      .from("organizations")
      .select("id, name, subscription_plan, subscription_status, trial_ends_at")
      .eq("id", orgId)
      .maybeSingle();

    if (fetchErr || !org) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    // Update org
    const { error: updateErr } = await supabase
      .from("organizations")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        trial_ends_at: newTrialEnd.toISOString(),
      })
      .eq("id", orgId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to update organization" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activation
    await supabase.from("activation_logs").insert({
      organization_id: orgId,
      org_name: org.name,
      old_plan: org.subscription_plan,
      new_plan: plan,
      old_status: org.subscription_status,
      new_status: "active",
      source: "webhook",
      notes: `+${days} dias via webhook`,
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
