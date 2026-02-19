import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const secret = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
    const expectedSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET_ENTERPRISE");

    if (!expectedSecret) {
      console.error("CAKTO_WEBHOOK_SECRET_ENTERPRISE not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authValue = secret?.replace("Bearer ", "") || "";
    if (authValue !== expectedSecret) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    console.log("Cakto Enterprise webhook payload:", JSON.stringify(payload));

    const email =
      payload.customer?.email ||
      payload.email ||
      payload.buyer?.email ||
      payload.data?.customer?.email ||
      payload.data?.email;

    if (!email) {
      console.error("No email found in payload:", JSON.stringify(payload));
      return new Response(
        JSON.stringify({ error: "No customer email in payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing Enterprise subscription for email:", email);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error listing users:", userError);
      throw userError;
    }

    const user = users.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      console.error("No user found for email:", email);
      return new Response(
        JSON.stringify({ error: "User not found for email" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        subscription_plan: "enterprise",
        subscription_status: "active",
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating organization:", updateError);
      throw updateError;
    }

    console.log(
      "Successfully updated subscription to Enterprise for user:",
      user.id
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
